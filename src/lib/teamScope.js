/** SQL helpers — scope data to a team using explicit team_id when present. */

export function eventTeamExpr(alias = "e") {
  return `COALESCE(${alias}.team_id, (SELECT u.team_id FROM users u WHERE u.id = ${alias}.created_by))`;
}

export function contentTeamExpr(alias, ownerCol) {
  return `COALESCE(${alias}.team_id, (SELECT u.team_id FROM users u WHERE u.id = ${alias}.${ownerCol}))`;
}
