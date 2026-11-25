export const inject = ['systemPrompt', 'tools']

export function apply(ctx) {
  // A preset inherits Host tools unless explicitly masked. No Chat-local tools
  // are registered, and the guard denies even an unexpected dispatch.
  ctx.tools.restrict({ allow: [] })
  ctx.tools.guard(() => 'Chat mode does not run tools.')

  // The built-in working-directory registration is required, so suppressing
  // optional runtime context alone is insufficient. A scoped shadow makes this
  // contribution optional without changing the shared directory service.
  ctx.systemPrompt.context({
    name: 'working-directory:current',
    order: ctx.systemPrompt.getContextOrder('WORKING_DIRECTORY'),
    text: '',
    interpolate: false,
  })

  ctx.on('agent/pre-step', async ({ messages }, next) => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    // Preserve the claimed user's original input, not expanded session
    // references or synthetic time, workspace, schedule, and goal messages.
    return { ...decision, messages: messages.filter(message => message.source.kind === 'user') }
  }, { prepend: true })
}
