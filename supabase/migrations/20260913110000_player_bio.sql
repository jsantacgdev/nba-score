-- ============================================
-- Datos fisicos y de procedencia del jugador
-- ============================================
-- Altura, peso, nacimiento, experiencia y universidad. Son de los datos
-- que mas se buscan en una ficha y ya venian en la plantilla que
-- sincronizamos cada dia, solo que los tirabamos.
--
-- La altura se guarda en centimetros ademas de en pies y pulgadas: la NBA
-- la publica como "6-8" y aqui se lee mejor en el sistema metrico.

alter table players add column height text;
alter table players add column height_cm int;
alter table players add column weight_kg int;
alter table players add column birth_date date;
-- Temporadas en la liga. 'R' en el origen significa novato, aqui 0.
alter table players add column experience int;
alter table players add column college text;
