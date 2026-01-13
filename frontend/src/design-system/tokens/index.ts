/**
 * 智慧教研平台 - 设计令牌系统入口
 * 
 * 导出所有设计令牌，供组件和样式使用
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './animations';
export * from './effects';

// 默认导出
import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import animations from './animations';
import effects from './effects';

export const tokens = {
  colors,
  typography,
  spacing,
  animations,
  effects,
};

export default tokens;
