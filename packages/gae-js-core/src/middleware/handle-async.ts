import { NextFunction } from "express";

export const handleAsync = (handlerFn: (req: Request, res: Response, next?: NextFunction) => Promise<unknown>) => (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> =>
  handlerFn(req, res, next)
    .then(() => next())
    .catch((error: unknown) => next(error));
