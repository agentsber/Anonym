/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/` | `/(tabs)/settings` | `/_sitemap` | `/auth/login` | `/auth/register` | `/create-group` | `/search` | `/security/lock` | `/security/setup-pin` | `/settings` | `/video-call`;
      DynamicRoutes: `/chat/${Router.SingleRoutePart<T>}` | `/group-manage/${Router.SingleRoutePart<T>}` | `/group/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/chat/[contactId]` | `/group-manage/[manageId]` | `/group/[groupId]`;
    }
  }
}
