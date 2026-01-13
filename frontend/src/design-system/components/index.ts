/**
 * 智慧教研平台 - 设计系统组件入口
 * 
 * 导出所有设计系统组件
 */

// 卡片组件
export { GlassCard, GlassCardClickable, GlassStatCard } from './GlassCard';
export type { GlassCardProps } from './GlassCard';

// 按钮组件
export { Button, IconButton } from './Button';
export type { ButtonProps, IconButtonProps } from './Button';

// 输入框组件
export { Input, SearchInput, PasswordInput } from './Input';
export type { InputProps, SearchInputProps } from './Input';

// 徽章组件
export { Badge, StatusBadge, CountBadge } from './Badge';
export type { BadgeProps, StatusBadgeProps, CountBadgeProps } from './Badge';

// 骨架屏组件
export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonStatCard,
  SkeletonList,
  SkeletonTable,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
} from './Skeleton';
export type { SkeletonProps, SkeletonTextProps, SkeletonAvatarProps, SkeletonCardProps, SkeletonListProps, SkeletonTableProps } from './Skeleton';

// 动画组件
export {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverLift,
  CountUp,
  PulseDot,
  LoadingDots,
  Typewriter,
  ProgressRing,
  RippleButton,
  Checkmark,
  FloatingElement,
  animations,
} from './AnimatedComponents';
