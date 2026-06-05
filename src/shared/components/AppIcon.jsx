import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Container,
  Droplets,
  Globe,
  Inbox,
  Leaf,
  Lightbulb,
  Pause,
  Plug,
  Search,
  Settings,
  Siren,
  Sprout,
  Sun,
  Thermometer,
  Wind,
  XCircle,
  Waves,
} from 'lucide-react';

const ICON_MAP = {
  'alert-triangle': AlertTriangle,
  sprout: Sprout,
  thermometer: Thermometer,
  wind: Wind,
  sun: Sun,
  droplets: Droplets,
  siren: Siren,
  settings: Settings,
  leaf: Leaf,
  container: Container,
  bot: Bot,
  search: Search,
  'bar-chart': BarChart3,
  inbox: Inbox,
  pause: Pause,
  plug: Plug,
  globe: Globe,
  lightbulb: Lightbulb,
  waves: Waves,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
};

export function AppIcon({
  name,
  size = 18,
  className,
  color,
  strokeWidth = 2,
}) {
  const Icon = ICON_MAP[name] || AlertTriangle;
  return (
    <Icon
      size={size}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
      aria-hidden
    />
  );
}

export function IconText({ icon, children, className, iconSize = 18, gap = 8 }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      <AppIcon name={icon} size={iconSize} />
      <span>{children}</span>
    </span>
  );
}

export function IconHeading({ icon, children, as: Tag = 'h3', className, iconSize = 18 }) {
  return (
    <Tag className={className} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
      <AppIcon name={icon} size={iconSize} />
      <span>{children}</span>
    </Tag>
  );
}

export default AppIcon;
