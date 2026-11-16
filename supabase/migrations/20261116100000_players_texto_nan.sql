update players
set
  position = nullif(position, 'nan'),
  height = nullif(height, 'nan'),
  college = nullif(college, 'nan')
where position = 'nan'
   or height = 'nan'
   or college = 'nan';
