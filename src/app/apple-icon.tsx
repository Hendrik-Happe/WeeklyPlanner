import { ImageResponse } from "next/og"
import { appConfig } from "@/lib/app-config"

export const size = {
  width: 180,
  height: 180,
}

export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${appConfig.iconBgStart} 0%, ${appConfig.iconBgEnd} 100%)`,
          borderRadius: 36,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            background: appConfig.iconPanel,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: appConfig.iconAccent,
            fontSize: 64,
            fontWeight: 700,
            boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          }}
        >
          {appConfig.iconText}
        </div>
      </div>
    ),
    size
  )
}