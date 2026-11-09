import { appIcon } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS runder hjørnene selv, så ikonet skal være helt firkantet
export default function AppleIcon() {
  return appIcon(180);
}
