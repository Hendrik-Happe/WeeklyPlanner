import { ImageResponse } from "next/og"
import { appConfig } from "@/lib/app-config"

export const size = {
  width: 192,
  height: 192,
}

export const contentType = "image/png"

export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${appConfig.iconBgStart} 0%, ${appConfig.iconBgEnd} 100%)`,
          borderRadius: 38,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 114,
            height: 114,
            background: appConfig.iconPanel,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: appConfig.iconAccent,
            fontSize: 70,
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
