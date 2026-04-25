export enum UserRole {
  SuperAdmin = 'superadmin',   // global administrator (owns the platform)
  OrgAdmin = 'OrgAdmin',           // administrator of an organization tenant
  OrgStaff = 'OrgStaff',          // professional that belongs to an org as staff
  Professional = 'Professional',   // independent professional (owns their own tenant)
  Paciente = 'Paciente',
}
