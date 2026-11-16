-- Business rule Prisma cannot express (hand-written): pockets are one level deep.
-- A CHECK constraint cannot read another row, hence a trigger:
--   * a pocket's parent must be a top-level account;
--   * an account that has pockets cannot become a pocket.
CREATE FUNCTION "finances_account_pocket_depth"() RETURNS trigger AS $$
BEGIN
  IF NEW."parentId" IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM "finances_account" WHERE "id" = NEW."parentId" AND "parentId" IS NOT NULL) THEN
      RAISE EXCEPTION 'finances_account_pocket_depth: a pocket cannot contain pockets' USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM "finances_account" WHERE "parentId" = NEW."id") THEN
      RAISE EXCEPTION 'finances_account_pocket_depth: an account with pockets cannot become a pocket' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "finances_account_pocket_depth_check"
  BEFORE INSERT OR UPDATE OF "parentId" ON "finances_account"
  FOR EACH ROW EXECUTE FUNCTION "finances_account_pocket_depth"();
