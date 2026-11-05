import { View, Text, Button } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>홈</Text>
            <Button
                title="온보딩 다시 보기"
                onPress={() => router.replace('/onboarding/language')}
            />
        </View>
    );
}

//stylesheet없음
