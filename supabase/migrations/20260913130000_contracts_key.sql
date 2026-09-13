-- ============================================
-- Un jugador puede pesar en dos nominas a la vez
-- ============================================
-- La clave era (jugador, temporada), dando por hecho que cada uno cobra de
-- un solo equipo. No es cierto: cuando a alguien lo cortan, su salario
-- sigue contando para el tope de su antiguo equipo mientras firma con
-- otro. Bradley Beal ocupa 19,4 millones en Phoenix y ademas tiene
-- contrato con los Clippers.
--
-- Con la clave anterior se perdia una de las dos filas y la nomina de un
-- equipo salia corta.

alter table player_contracts drop constraint player_contracts_pkey;
alter table player_contracts add primary key (player_id, team_id, season);
