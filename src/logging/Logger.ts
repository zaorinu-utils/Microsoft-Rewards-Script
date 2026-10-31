import chalk from 'chalk'
import cluster from 'cluster'
import { sendDiscord } from './Discord'
import type { MicrosoftRewardsBot } from '../index'
import { errorDiagnostic } from '../util/ErrorDiagnostic'
import type { LogFilter } from '../interface/Config'
import { terminalDashboard } from '../interface/TerminalDashboard'
import { createErrorReference } from '../constants/errorWords'

export type Platform = boolean | 'main'
export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
export type ColorKey = keyof typeof chalk
export interface IpcLog {
    content: string
    level: LogLevel
}

type ChalkFn = (msg: string) => string

function platformText(platform: Platform): string {
    return platform === 'main' ? 'MAIN' : platform ? 'MOBILE' : 'DESKTOP'
}

function platformBadge(platform: Platform): string {
    return platform === 'main' ? chalk.bgCyan('MAIN') : platform ? chalk.bgBlue('MOBILE') : chalk.bgMagenta('DESKTOP')
}

function getColorFn(color?: ColorKey): ChalkFn | null {
    return color && typeof chalk[color] === 'function' ? (chalk[color] as ChalkFn) : null
}

function consoleOut(level: LogLevel, msg: string, chalkFn: ChalkFn | null): void {
    const out = chalkFn ? chalkFn(msg) : msg
    switch (level) {
        case 'warn':
            return console.warn(out)
        case 'error':
            return console.error(out)
        default:
            return console.log(out)
    }
}

function formatMessage(message: string | Error, includeStack = false): string {
    const value = message instanceof Error ? message.message : message
    const firstLine = value.split(/\r?\n|\\n/, 1)[0]?.trim() || (message instanceof Error ? message.name : '')
    if (!includeStack) return firstLine
    if (message instanceof Error) return message.stack?.trim() || `${message.name}: ${message.message}`
    return message.replace(/\r?\n/g, '\n')
}

export class Logger {
    constructor(private bot: MicrosoftRewardsBot) {}

    info(isMobile: Platform, title: string, message: string, color?: ColorKey) {
        return this.baseLog('info', isMobile, title, message, color)
    }

    warn(isMobile: Platform, title: string, message: string | Error, color?: ColorKey) {
        return this.baseLog('warn', isMobile, title, message, color)
    }

    error(isMobile: Platform, title: string, message: string | Error, color?: ColorKey): Promise<void> {
        return this.baseLog('error', isMobile, title, message, color)
    }

    debug(isMobile: Platform, title: string, message: string | Error, color?: ColorKey) {
        return this.baseLog('debug', isMobile, title, message, color)
    }

    private async baseLog(
        level: LogLevel,
        isMobile: Platform,
        title: string,
        message: string | Error,
        color?: ColorKey
    ): Promise<void> {
        const config = this.bot.config
        const developmentMode = process.argv.includes('-dev')
        if (level === 'debug' && !config.debugLogs && !developmentMode) return

        const now = new Date().toLocaleString()
        const formatted = formatMessage(message, developmentMode)
        const displayMessage = formatMessage(message, developmentMode)
        const userName = this.bot.userData.userName || 'MAIN'
        const levelTag = level.toUpperCase()
        const cleanMsg = `[${now}] [${userName}] [${levelTag}] ${platformText(isMobile)} [${title}] ${formatted}`

        if (level === 'error' && config.errorDiagnostics) {
            const page = this.bot.isMobile ? this.bot.mainMobilePage : this.bot.mainDesktopPage
            const error = message instanceof Error ? message : new Error(String(message))
            await errorDiagnostic(page, error, config.diagnosticsPassword)
        }

        const consoleAllowed = developmentMode || this.shouldPassFilter(config.consoleLogFilter, level, cleanMsg)
        const webhookAllowed =
            developmentMode ||
            this.shouldPassFilter(config.webhook.webhookLogFilter, level, cleanMsg)

        if (consoleAllowed) {
            let logColor: ColorKey | undefined = color
            if (!logColor) {
                if (level === 'error') logColor = 'red'
                else if (level === 'warn') logColor = 'yellow'
                else if (level === 'debug') logColor = 'magenta'
            }

            if (developmentMode) {
                consoleOut(level, cleanMsg, getColorFn(logColor))
                return this.sendWebhook(webhookAllowed, config, cleanMsg, level)
            }

            const displayedLog = terminalDashboard.writeLog(
                level,
                userName,
                title,
                `${platformText(isMobile)} ${displayMessage}`
            )
            if (!displayedLog) {
                const detail = level === 'error' && !developmentMode
                    ? `${displayMessage} [Reference: ${createErrorReference(message)}]`
                    : displayMessage
                const consoleStr = `[${now}] [${userName}] [${levelTag}] ${platformBadge(isMobile)} [${title}] ${detail}`
                consoleOut(level, consoleStr, getColorFn(logColor))
            }
        }

        this.sendWebhook(webhookAllowed, config, cleanMsg, level)
    }

    private sendWebhook(
        webhookAllowed: boolean,
        config: MicrosoftRewardsBot['config'],
        cleanMsg: string,
        level: LogLevel
    ): void {
        if (!webhookAllowed || (level === 'debug' && !process.argv.includes('-dev'))) return

        const hasWebhook = Boolean(config.webhook.discord?.enabled && config.webhook.discord.url)
        if (!hasWebhook) return

        if (cluster.isPrimary) {
            if (config.webhook.discord?.enabled && config.webhook.discord.url) {
                sendDiscord(config.webhook.discord.url, cleanMsg, level)
            }
        } else {
            process.send?.({ __ipcLog: { content: cleanMsg, level } })
        }
    }

    private shouldPassFilter(filter: LogFilter | undefined, level: LogLevel, message: string): boolean {
        if (!filter || !filter.enabled) {
            return true
        }

        const { mode, levels, keywords, regexPatterns } = filter

        const hasLevelRule = Array.isArray(levels) && levels.length > 0
        const hasKeywordRule = Array.isArray(keywords) && keywords.length > 0
        const hasPatternRule = Array.isArray(regexPatterns) && regexPatterns.length > 0

        if (!hasLevelRule && !hasKeywordRule && !hasPatternRule) {
            return mode === 'blacklist'
        }

        const lowerMessage = message.toLowerCase()
        let isMatch = false

        if (hasLevelRule && levels!.includes(level)) {
            isMatch = true
        }

        if (!isMatch && hasKeywordRule) {
            if (keywords!.some(k => lowerMessage.includes(k.toLowerCase()))) {
                isMatch = true
            }
        }

        if (!isMatch && hasPatternRule) {
            for (const pattern of regexPatterns!) {
                try {
                    const regex = new RegExp(pattern, 'i')
                    if (regex.test(message)) {
                        isMatch = true
                        break
                    }
                } catch {}
            }
        }

        return mode === 'whitelist' ? isMatch : !isMatch
    }
}
