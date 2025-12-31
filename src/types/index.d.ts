declare namespace Express {
  export interface Request {
    user?: { id: string; userId: string; email: string , type: string };
    rawBody: any;
  }
}
