import { ImageResponse } from "next/og"
import { appConfig } from "@/lib/app-config"

export const size = {
  width: 512,
  height: 512,
}

export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${appConfig.iconBgStart} 0%, ${appConfig.iconBgEnd} 100%)`,
          borderRadius: 96,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            background: appConfig.iconPanel,
            borderRadius: 40,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              height: 72,
              background: appConfig.iconPanelSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 32px",
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 14, height: 14, borderRadius: 999, background: appConfig.iconBgEnd }} />
              <div style={{ width: 14, height: 14, borderRadius: 999, background: appConfig.iconBgEnd }} />
              <div style={{ width: 14, height: 14, borderRadius: 999, background: appConfig.iconBgEnd }} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: appConfig.iconBgEnd }}>{appConfig.iconText}</div>
          </div>

          <div style={{ display: "flex", padding: 34, gap: 26, flex: 1 }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 22,
                background: appConfig.iconAccent,
                color: "white",
                alignItems: "center",
                justifyContent: "center",
                display: "flex",
                fontSize: 50,
                fontWeight: 700,
              }}
            >
              {appConfig.iconText}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1, paddingTop: 8 }}>
              <div style={{ height: 22, borderRadius: 999, background: appConfig.iconAccentSoft }} />
              <div style={{ height: 22, width: "82%", borderRadius: 999, background: appConfig.iconAccentSoft }} />
              <div style={{ height: 22, width: "68%", borderRadius: 999, background: appConfig.iconAccentSoft }} />
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}