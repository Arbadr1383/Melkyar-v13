const STORES = new Set([
  'properties','customers','activities','settings','owners','visits','followups','deals','commissions',
  'transactions','accounts','loans','builders','users','tasks','notifications','messages','userRequests'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=UTF-8' } });
}

function validStore(store) { return typeof store === 'string' && STORES.has(store); }

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok:false, error:'اتصال D1 تنظیم نشده است.' }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok:false, error:'درخواست نامعتبر است.' }, 400); }
  const { action, store } = body || {};
  if (!validStore(store)) return json({ ok:false, error:'Store نامعتبر است.' }, 400);

  try {
    if (action === 'getAll') {
      const r = await env.DB.prepare('SELECT id, data FROM records WHERE store = ? ORDER BY id ASC').bind(store).all();
      return json({ ok:true, data:r.results.map(x => JSON.parse(x.data)) });
    }
    if (action === 'get') {
      const id = body.id;
      const r = await env.DB.prepare('SELECT data FROM records WHERE store = ? AND id = ?').bind(store, Number(id)).first();
      return json({ ok:true, data:r ? JSON.parse(r.data) : undefined });
    }
    if (action === 'add') {
      const record = body.record;
      if (!record || typeof record !== 'object') return json({ok:false,error:'رکورد نامعتبر است.'},400);
      const now = new Date().toISOString();
      const max = await env.DB.prepare('SELECT COALESCE(MAX(id),0) AS max_id FROM records WHERE store = ?').bind(store).first();
      const id = Number(max?.max_id || 0) + 1;
      const payload = { ...record, id, createdAt: record.createdAt || now, updatedAt: now };
      await env.DB.prepare('INSERT INTO records (store,id,data,created_at,updated_at) VALUES (?,?,?,?,?)')
        .bind(store,id,JSON.stringify(payload),payload.createdAt,payload.updatedAt).run();
      return json({ok:true,data:payload});
    }
    if (action === 'update') {
      const id = Number(body.id);
      const existing = await env.DB.prepare('SELECT data FROM records WHERE store = ? AND id = ?').bind(store,id).first();
      if (!existing) return json({ok:false,error:`رکورد با شناسهٔ ${id} در ${store} پیدا نشد`},404);
      const old = JSON.parse(existing.data);
      const payload = { ...old, ...(body.patch || {}), id, updatedAt:new Date().toISOString() };
      await env.DB.prepare('UPDATE records SET data=?, updated_at=? WHERE store=? AND id=?')
        .bind(JSON.stringify(payload),payload.updatedAt,store,id).run();
      return json({ok:true,data:payload});
    }
    if (action === 'remove') {
      await env.DB.prepare('DELETE FROM records WHERE store=? AND id=?').bind(store,Number(body.id)).run();
      return json({ok:true,data:true});
    }
    if (action === 'clear') {
      await env.DB.prepare('DELETE FROM records WHERE store=?').bind(store).run();
      return json({ok:true,data:true});
    }
    if (action === 'bulkAdd') {
      const records = Array.isArray(body.records) ? body.records : [];
      if (!records.length) return json({ok:true,data:[]});
      const max = await env.DB.prepare('SELECT COALESCE(MAX(id),0) AS max_id FROM records WHERE store = ?').bind(store).first();
      let next = Number(max?.max_id || 0) + 1;
      const now = new Date().toISOString();
      const out = records.map(rec => ({ ...rec, id: rec.id ?? next++, createdAt: rec.createdAt || now, updatedAt: rec.updatedAt || now }));
      const statements = out.map(p => env.DB.prepare('INSERT OR REPLACE INTO records (store,id,data,created_at,updated_at) VALUES (?,?,?,?,?)').bind(store,p.id,JSON.stringify(p),p.createdAt,p.updatedAt));
      await env.DB.batch(statements);
      return json({ok:true,data:out});
    }
    return json({ok:false,error:'عملیات نامعتبر است.'},400);
  } catch (e) {
    console.error(e);
    return json({ok:false,error:e?.message || 'خطای پایگاه داده'},500);
  }
}
