// 취소·확인 두 버튼 확인 창. 누른 버튼을 true(확인)·false(취소) 로 돌려준다.
// 앱은 Alert. 웹은 react-native-web 의 Alert 가 아무것도 띄우지 않아서 브라우저 confirm 으로 대신한다(웹 확인용).

import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  message: string;
  cancelText: string;
  confirmText: string;
  destructive?: boolean; // iOS 에서 확인 버튼을 빨간 글자로
};

export function confirmDialog({ title, message, cancelText, confirmText, destructive }: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      // Android 바깥 터치로 닫으면 취소
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
