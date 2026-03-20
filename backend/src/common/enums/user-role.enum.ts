export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  /** @deprecated use OrgAdmin */
  TenantOrg = 'TenantOrg',
  OrgAdmin = 'OrgAdmin',           // administrator of an organization tenant
  OrgStaff = 'OrgStaff',          // professional that belongs to an org as staff
  /** @deprecated use OrgStaff or Professional */
  TenantProf = 'TenantProf',
  Professional = 'Professional',   // independent professional (owns their own tenant)
  Paciente = 'Paciente',
}
