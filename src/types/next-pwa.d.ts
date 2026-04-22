declare module "next-pwa" {
  type NextPwaOptions = {
    dest: string
    disable?: boolean
    register?: boolean
    skipWaiting?: boolean
  }

  type NextConfig = Record<string, unknown>

  export default function withPWAInit(options: NextPwaOptions): (
    config: NextConfig
  ) => NextConfig
}
