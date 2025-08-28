import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export type AuthUser = {
  userId: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'EDITOR';
};

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthUser | undefined }>();
    return request.user;
  },
);
