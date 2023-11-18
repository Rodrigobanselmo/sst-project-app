import { Dimensions, Platform } from 'react-native';
import StaticSafeAreaInsets from 'react-native-static-safe-area-insets';
import { THEME } from '../theme/theme';

export const CONTENT_SPACING = 15;
export const ALBUM_NAME = 'SimpleSST';
export const ALBUM_NAME_VIDEO = 'SimpleSST Videos';

export const pagePadding = THEME.space.pagePadding;
export const pagePaddingPx = THEME.space.pagePaddingPx;

const SAFE_BOTTOM =
    Platform.select({
        ios: StaticSafeAreaInsets.safeAreaInsetsBottom,
    }) ?? 0;

export const SAFE_AREA_PADDING = {
    paddingLeft: StaticSafeAreaInsets.safeAreaInsetsLeft + CONTENT_SPACING,
    paddingTop: StaticSafeAreaInsets.safeAreaInsetsTop + CONTENT_SPACING,
    paddingRight: StaticSafeAreaInsets.safeAreaInsetsRight + CONTENT_SPACING,
    paddingBottom: SAFE_BOTTOM + CONTENT_SPACING,
};

export const MAX_ZOOM_FACTOR = 20;

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Platform.select<number>({
    android: Dimensions.get('screen').height - StaticSafeAreaInsets.safeAreaInsetsBottom,
    ios: Dimensions.get('window').height,
}) as number;

export const simpleCompanyId = 'b8635456-334e-4d6e-ac43-cfe5663aee17';
export const simpleWorkspaceId = 'cad63aae-50e9-4e9d-914d-ef040d22ba1a';
export const riskAllId = '776ca693-e69e-486f-9e52-c60d254acf6d';
