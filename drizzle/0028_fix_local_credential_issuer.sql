UPDATE `account`
SET `issuer` = 'local:credential'
WHERE `provider_id` = 'credential'
  AND `account_id` = `user_id`
  AND (`issuer` IS NULL OR `issuer` = '');
