import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type GameSessionParams = {
  sessionId: string;
  sessionName: string;
  playerId: string;
  playerName: string;
  playerToken: string;
  isHost: boolean;
};

export type RootStackParamList = {
  Home: undefined;
  GameSession: GameSessionParams;
  Settings: undefined;
  SessionHistory: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
