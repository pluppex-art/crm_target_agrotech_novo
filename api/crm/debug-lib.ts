import { setCorsSimple } from '../_lib/utils';

export default function handler(req: any, res: any) {
  setCorsSimple(res);
  res.json({ ok: true, cross_dir_import: true });
}
