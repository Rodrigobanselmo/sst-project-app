import { Theme as NativeTheme } from 'native-base';
import { THEME } from '../theme/theme'

type CustomThemeType = typeof THEME

declare module 'native-base' {
  interface ICustomTheme extends CustomThemeType { }
}