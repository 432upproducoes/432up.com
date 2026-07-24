/* ========== supabase.js · 432UP · v2.1.0 · 2026-02-26 ========== */
/* Cliente Supabase único — depende de config.js e do CDN @supabase/supabase-js@2 */

var SB = (function () {
  'use strict';

  /* ── Cliente ── */
  var client = supabase.createClient(CFG.SB_URL, CFG.SB_KEY);

  /* ── Headers padrão para fetch direto (keepalive / beacon) ── */
  var hdrs = {
    'Content-Type':  'application/json',
    'apikey':        CFG.SB_KEY,
    'Authorization': 'Bearer ' + CFG.SB_KEY,
    'Prefer':        'return=minimal'
  };

  /* ── GET genérico ── */
  async function sbGet(table, query) {
    /* query = { select, eq, order, ascending, filter } */
    query = query || {};
    var q = client.from(table).select(query.select || '*');
    if (query.eq)    q = q.eq(query.eq[0], query.eq[1]);
    if (query.order) q = q.order(query.order, { ascending: query.ascending !== false });
    if (query.filter) query.filter.forEach(function (f) { q = q.eq(f[0], f[1]); });
    var r = await q;
    return r;
  }

  /* ── POST genérico (via cliente) ── */
  async function sbPost(table, obj) {
    return await client.from(table).insert(obj);
  }

  /* ── POST com keepalive (para leads — funciona mesmo ao sair da página) ── */
  function sbBeacon(table, obj) {
    try {
      fetch(CFG.SB_URL + '/rest/v1/' + table, {
        method:    'POST',
        headers:   hdrs,
        body:      JSON.stringify(obj),
        keepalive: true
      }).then(function (r) {
        if (r.ok) console.log('[432] Beacon OK → ' + table);
        else r.text().then(function (t) { console.error('[432] Beacon erro:', r.status, t); });
      }).catch(function (e) { console.error('[432] Beacon catch:', e); });
    } catch (e) { console.error('[432] Beacon outer:', e); }
  }

  /* ── PATCH genérico ── */
  async function sbPatch(table, match, obj) {
    return await client.from(table).update(obj).match(match);
  }

  /* ── DELETE genérico ── */
  async function sbDelete(table, match) {
    return await client.from(table).delete().match(match);
  }

  /* ── Upload para Storage ── */
  async function sbUpload(bucket, path, file, contentType) {
    return await client.storage
      .from(bucket || CFG.SB_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: true, contentType: contentType });
  }

  /* ── URL pública de Storage ── */
  function sbPublicUrl(bucket, path) {
    return client.storage.from(bucket || CFG.SB_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /* ── Expor ── */
  return {
    client:      client,
    get:         sbGet,
    post:        sbPost,
    beacon:      sbBeacon,
    patch:       sbPatch,
    del:         sbDelete,
    upload:      sbUpload,
    publicUrl:   sbPublicUrl,
    headers:     hdrs
  };
})();
