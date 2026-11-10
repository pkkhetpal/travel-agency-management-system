import { requirePageSession } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { CustomersWorkspace } from "@/components/customers-workspace";
export const dynamic = "force-dynamic";
export default async function CustomersPage(){
 const session=await requirePageSession();
 const customers=await prisma.customer.findMany({where:{companyId:session.companyId},orderBy:{updatedAt:"desc"},take:100});
 const safe=customers.map(c=>({...c,createdAt:c.createdAt.toISOString(),updatedAt:c.updatedAt.toISOString()}));
 return <CustomersWorkspace initialCustomers={safe}/>;
}
