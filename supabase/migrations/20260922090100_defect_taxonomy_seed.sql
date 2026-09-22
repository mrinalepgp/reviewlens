-- ==============================================================================
-- ReviewLens — Dynamic defect taxonomy seed
--
-- `return_risk_factor` is the share of buyers who return a unit once this defect
-- is present; `severity_weight` is how heavily the defect drags listing health.
-- Both feed the bleed formula in src/lib/bleed.ts. Idempotent via ON CONFLICT.
-- ==============================================================================

INSERT INTO public.defect_taxonomies
  (category, aspect, defect_label, keywords, severity_weight, return_risk_factor)
VALUES
  -- ── Electronics ────────────────────────────────────────────────────────────
  ('Electronics', 'Durability',  'Screen Burn-In',        ARRAY['screen burn','burn in','dead pixel','discolour','discolor','ghosting'], 0.85, 0.62),
  ('Electronics', 'Usability',   'Audio Lag',             ARRAY['audio lag','sound delay','latency','out of sync','lip sync'],           0.60, 0.38),
  ('Electronics', 'Durability',  'Battery Drain',         ARRAY['battery drain','battery backup','discharge','charge quickly','drains'], 0.75, 0.55),
  ('Electronics', 'Durability',  'Overheating',           ARRAY['overheat','heating','too hot','thermal','warm'],                        0.80, 0.58),
  ('Electronics', 'Packaging',   'Damaged On Arrival',    ARRAY['damaged','broken on arrival','cracked','dent'],                         0.95, 0.88),
  ('Electronics', 'Delivery',    'Wrong Item Shipped',    ARRAY['wrong item','different product','not as ordered','duplicate'],          0.90, 0.92),

  -- ── Fashion ────────────────────────────────────────────────────────────────
  ('Fashion', 'Durability',  'Fabric Shrinkage',      ARRAY['shrink','shrunk','after wash','washing'],                     0.70, 0.48),
  ('Fashion', 'Durability',  'Stitching Failure',     ARRAY['stitch','seam','thread coming out','torn','tear'],            0.80, 0.60),
  ('Fashion', 'Sizing',      'Size Mismatch',         ARRAY['size','too small','too large','tight','loose','fitting'],     0.65, 0.72),
  ('Fashion', 'Usability',   'Colour Bleeding',       ARRAY['colour bleed','color bleed','faded','fading','colour gone'],  0.68, 0.45),
  ('Fashion', 'Packaging',   'Missing Accessory',     ARRAY['missing','not received','incomplete','without'],              0.72, 0.55),
  ('Fashion', 'Delivery',    'Late Delivery',         ARRAY['late','delayed','took too long','never arrived'],             0.40, 0.18),

  -- ── Footwear ───────────────────────────────────────────────────────────────
  ('Footwear', 'Durability',  'Sole Separation',      ARRAY['sole came off','sole separat','glue','peeling','detach'],     0.88, 0.70),
  ('Footwear', 'Sizing',      'Size Runs Small',      ARRAY['runs small','order one size','tight','narrow'],               0.60, 0.68),
  ('Footwear', 'Usability',   'Insole Discomfort',    ARRAY['uncomfortable','hurts','blister','hard sole','cushion'],      0.62, 0.42),
  ('Footwear', 'Packaging',   'Mismatched Pair',      ARRAY['different size','odd pair','two left','mismatch'],            0.95, 0.90),

  -- ── Home & Kitchen ─────────────────────────────────────────────────────────
  ('Home & Kitchen', 'Durability', 'Non-Stick Peeling',  ARRAY['non stick','coating','peel','chipping','scratch'],         0.78, 0.52),
  ('Home & Kitchen', 'Packaging',  'Leaked In Transit',  ARRAY['leak','spill','broken seal','wet'],                        0.85, 0.75),
  ('Home & Kitchen', 'Usability',  'Poor Build Quality', ARRAY['flimsy','cheap plastic','wobbly','breaks easily'],         0.75, 0.55),

  -- ── Beauty & Personal Care ─────────────────────────────────────────────────
  ('Beauty', 'Packaging',  'Seal Tampered',       ARRAY['seal broken','tampered','opened','used product'],                 0.92, 0.85),
  ('Beauty', 'Usability',  'Skin Reaction',       ARRAY['rash','irritation','allergic','burning','itch'],                  0.90, 0.66),
  ('Beauty', 'Durability', 'Expired Stock',       ARRAY['expired','expiry','old stock','manufacture date'],                0.95, 0.88),

  -- ── General fallback: applied when a SKU's category cannot be resolved ──────
  ('General', 'Durability', 'Product Defective',   ARRAY['defective','faulty','not working','stopped working','dead'],     0.90, 0.80),
  ('General', 'Packaging',  'Poor Packaging',      ARRAY['packaging','packed badly','no bubble wrap','box damaged'],       0.55, 0.30),
  ('General', 'Delivery',   'Delivery Issue',      ARRAY['delivery','courier','delayed','lost in transit'],                0.45, 0.20),
  ('General', 'Usability',  'Not As Described',    ARRAY['not as described','misleading','fake','duplicate','first copy'], 0.85, 0.78),
  ('General', 'Sizing',     'Sizing Issue',        ARRAY['size','fit','dimension','measurement'],                          0.60, 0.65)
ON CONFLICT (category, defect_label) DO UPDATE SET
  aspect             = EXCLUDED.aspect,
  keywords           = EXCLUDED.keywords,
  severity_weight    = EXCLUDED.severity_weight,
  return_risk_factor = EXCLUDED.return_risk_factor;
