/** How a finished drawing keeps moving while the lesson plays. */
export type Motion = "spin" | "sway" | "float" | "pulse" | "drive" | "trace";

const ICON_MOTION: Record<string, Motion> = {};
const assign = (motion: Motion, names: string) => names.split(" ").forEach((n) => (ICON_MOTION[n] = motion));
assign("spin", "sun cog settings atom recycle molecule");
assign("sway", "leaf sprout flower flower-2 wheat tree-pine tree-deciduous feather flag");
assign(
  "float",
  "cloud cloud-rain cloud-snow cloud-lightning moon earth globe planet-ringed planet-banded planet-small comet asteroid rocket satellite fish bird bug snowflake droplet droplets plane ship cell shell turtle snail dna sparkles",
);
assign("pulse", "heart heart-pulse lightbulb zap star flame battery-charging brain magnet target activity wifi radio megaphone");
assign("drive", "car bus truck train-front bike");

export const iconMotion = (name: string): Motion | undefined => ICON_MOTION[name];
