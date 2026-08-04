// SHOT=1일 때는 HMR·파일 워처를 끈다. 병렬 에이전트가 샷 도중 파일을 쓰면
// vite가 full reload를 내려 window.__CECIL__이 날아가고 모든 샷이 실패한다.
const shot = process.env.SHOT === '1'

export default {
  server: {
    host: '127.0.0.1',
    hmr: shot ? false : undefined,
    watch: shot ? { ignored: ['**'] } : undefined
  },
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['@dimforge/rapier3d-compat'] }
}
