export const inject = ['agentPresets', 'sessions']

const PRESET = 'chat'
const FOREIGN_HISTORY = 'Chat mode requires conversation-only history. Start a new session and select Chat before sending the first message.'
const MODEL_TOOL = 'The model attempted a tool call in Chat mode. No tool was run.'

function isConversationMessage(message) {
  if (message.role === 'user' && message.source?.kind === 'user') {
    return message.content.every(block => ['text', 'image', 'file'].includes(block.type))
  }
  if (message.role === 'assistant' && message.source?.kind === 'model') {
    return message.content.every(block => ['text', 'reasoning'].includes(block.type))
  }
  return false
}

async function* fail(code, message) {
  yield { type: 'finish', reason: { kind: 'error', failure: { code, message } } }
}

async function* noToolOutput(stream) {
  for await (const chunk of stream) {
    if (chunk.type === 'tool-call-delta'
      || (chunk.type === 'block-start' && chunk.blockType === 'tool-call')
      || (chunk.type === 'block-end' && chunk.block.type === 'tool-call')
      || (chunk.type === 'finish' && chunk.reason.kind === 'tool-calls')) {
      // Stop before the loop can commit an assistant tool call to history.
      throw new Error(MODEL_TOOL)
    }
    yield chunk
  }
}

export function apply(ctx) {
  // Scope Host-wide hooks by the durable preset on the exact Session rather
  // than relying on ambient initiator state (title work is detached).
  const isChat = sessionId => {
    const session = sessionId === undefined ? undefined : ctx.sessions.get(sessionId)
    return session !== undefined && ctx.agentPresets.presetForSession(session) === PRESET
  }

  // The official adapter can otherwise upload an auxiliary DSH session-log
  // field (separate from prompt messages). Never attach that field for Chat.
  ctx.inject(['sessionLogDeepSeek'], child => {
    child.sessionLogDeepSeek.registerExclusion(({ sessionId }) => isChat(sessionId))
  })

  ctx.on('llm/stream', (request, next) => {
    if (!isChat(request.sessionId)) return next()

    // No auxiliary model call (including first-message AI title generation).
    // The Host's deterministic fallback title remains available.
    if (request.purpose !== undefined) {
      return fail('CHAT_AUXILIARY_DISABLED', 'Chat mode does not use an auxiliary model request.')
    }

    // Never rewrite a frozen loop request. Refuse to dispatch if another
    // extension or a seeded session would introduce non-conversation content.
    if (request.system !== undefined || request.tools !== undefined
      || request.toolHistory?.tools.length || request.toolHistory?.updates.length
      || !request.messages.every(isConversationMessage)) {
      throw new Error(FOREIGN_HISTORY)
    }
    return noToolOutput(next())
  }, { prepend: true })
}
