import { notFound } from "next/navigation";
import { SectionPage } from "@/components/section-page";

const data = {
  enquiries: {title:"Enquiries",description:"Capture customer requests and keep every follow-up on track.",action:"New enquiry",metrics:[{label:"Open enquiries",value:"18"},{label:"Follow-ups due",value:"08"},{label:"Converted this month",value:"12"}],columns:["ENQUIRY / CUSTOMER","TRAVEL DATE","STATUS"],rows:[
    {title:"Bali holiday enquiry",subtitle:"ENQ-0261 · Aarav Mehta",detail:"14 Nov 2026",status:"New",tone:"blue" as const},
    {title:"Family trip to Kerala",subtitle:"ENQ-0260 · Kunal Verma",detail:"22 Nov 2026",status:"Follow-up due",tone:"amber" as const},
    {title:"Dubai honeymoon",subtitle:"ENQ-0258 · Riya Shah",detail:"18 Nov 2026",status:"Quoted",tone:"green" as const}]},
  quotations: {title:"Quotations",description:"Prepare travel proposals, share prices and track customer decisions.",action:"Create quotation",metrics:[{label:"Draft quotations",value:"06"},{label:"Awaiting response",value:"09"},{label:"Accepted this month",value:"14"}],columns:["QUOTATION / CUSTOMER","VALID UNTIL","STATUS"],rows:[
    {title:"Bali Family Escape",subtitle:"QT-2026-0081 · Aarav Mehta",detail:"12 Nov 2026",status:"Sent",tone:"blue" as const},
    {title:"Dubai Honeymoon",subtitle:"QT-2026-0080 · Riya Shah",detail:"15 Nov 2026",status:"Accepted",tone:"green" as const},
    {title:"Kerala Backwaters",subtitle:"QT-2026-0079 · Kunal Verma",detail:"09 Nov 2026",status:"Draft",tone:"gray" as const}]},
  packages: {title:"Packages",description:"Organise trips, bookings, suppliers, guests and package finances.",action:"New package",metrics:[{label:"Active packages",value:"24"},{label:"Upcoming departures",value:"08"},{label:"In planning",value:"05"}],columns:["PACKAGE / CUSTOMER","DEPARTURE","STATUS"],rows:[
    {title:"Bali Family Escape",subtitle:"PKG-2026-0042 · Aarav Mehta",detail:"14 Nov 2026",status:"Confirmed",tone:"green" as const},
    {title:"Dubai Honeymoon",subtitle:"PKG-2026-0041 · Riya Shah",detail:"18 Nov 2026",status:"In progress",tone:"blue" as const},
    {title:"Kerala Backwaters",subtitle:"PKG-2026-0039 · Kunal Verma",detail:"22 Nov 2026",status:"Pending",tone:"amber" as const}]},
  customers: {title:"Customers & Guests",description:"Keep customer profiles, traveller details and documents together.",action:"Add customer",metrics:[{label:"Total customers",value:"286"},{label:"Added this month",value:"24"},{label:"Repeat customers",value:"38"}],columns:["CUSTOMER","CONTACT","TYPE"],rows:[
    {title:"Aarav Mehta",subtitle:"CUS-0182",detail:"+91 98XXX 12045",status:"Active",tone:"green" as const},
    {title:"Riya Shah",subtitle:"CUS-0181",detail:"riya@example.com",status:"Active",tone:"green" as const},
    {title:"Kunal Verma",subtitle:"CUS-0179",detail:"+91 98XXX 45021",status:"New",tone:"blue" as const}]},
  bookings: {title:"Bookings",description:"Track flight, hotel, transfer, activity, visa and cruise reservations.",action:"Add booking",metrics:[{label:"Total bookings",value:"67"},{label:"Awaiting confirmation",value:"07"},{label:"Confirmed",value:"52"}],columns:["BOOKING / PACKAGE","SERVICE DATE","STATUS"],rows:[
    {title:"Hotel · Ubud Resort",subtitle:"BKG-0128 · Bali Family Escape",detail:"14 Nov 2026",status:"Confirmed",tone:"green" as const},
    {title:"Flight · BOM to DXB",subtitle:"BKG-0127 · Dubai Honeymoon",detail:"18 Nov 2026",status:"Pending",tone:"amber" as const},
    {title:"Houseboat · Alleppey",subtitle:"BKG-0125 · Kerala Backwaters",detail:"23 Nov 2026",status:"Confirmed",tone:"green" as const}]},
  suppliers: {title:"Suppliers",description:"Manage hotels, transport partners, DMCs, airlines and service providers.",action:"Add supplier",metrics:[{label:"Active suppliers",value:"42"},{label:"Bills to review",value:"05"},{label:"Supplier balances",value:"₹2.16L"}],columns:["SUPPLIER","CONTACT","STATUS"],rows:[
    {title:"Island Holidays DMC",subtitle:"SUP-0031 · Destination partner",detail:"ops@example.com",status:"Active",tone:"green" as const},
    {title:"Ubud Garden Resort",subtitle:"SUP-0028 · Hotel",detail:"+62 361 XXX",status:"Active",tone:"green" as const},
    {title:"Skyline Transfers",subtitle:"SUP-0024 · Transport",detail:"accounts@example.com",status:"Review",tone:"amber" as const}]},
  itineraries: {title:"Itineraries",description:"Build day-wise travel plans and share trip details with customers.",action:"Create itinerary",metrics:[{label:"Upcoming trips",value:"08"},{label:"Draft itineraries",value:"04"},{label:"Shared with guests",value:"19"}],columns:["ITINERARY / PACKAGE","START DATE","STATUS"],rows:[
    {title:"Bali · Island discovery",subtitle:"ITN-0042 · Bali Family Escape",detail:"14 Nov 2026",status:"Ready",tone:"green" as const},
    {title:"Dubai · Romance escape",subtitle:"ITN-0041 · Dubai Honeymoon",detail:"18 Nov 2026",status:"Draft",tone:"amber" as const},
    {title:"Kerala · Backwater trail",subtitle:"ITN-0039 · Kerala Backwaters",detail:"22 Nov 2026",status:"Shared",tone:"blue" as const}]},
  finance: {title:"Receivables & Payables",description:"Track customer collections and supplier bills without a full accounting system.",action:"Record transaction",metrics:[{label:"Customer receivables",value:"₹4,82,500"},{label:"Supplier payables",value:"₹2,16,800"},{label:"Overdue items",value:"03"}],columns:["PARTY / PACKAGE","DUE DATE","STATUS"],rows:[
    {title:"Aarav Mehta · Balance due",subtitle:"REC-0081 · Bali Family Escape",detail:"12 Nov 2026",status:"Due soon",tone:"amber" as const},
    {title:"Island Holidays DMC · Bill",subtitle:"BILL-0038 · Bali Family Escape",detail:"15 Nov 2026",status:"Pending",tone:"blue" as const},
    {title:"Riya Shah · Advance received",subtitle:"REC-0080 · Dubai Honeymoon",detail:"05 Nov 2026",status:"Allocated",tone:"green" as const}]},
  reports: {title:"Reports",description:"Understand sales activity, package performance and outstanding balances.",action:"Export report",metrics:[{label:"Sales this month",value:"₹12.8L"},{label:"Estimated gross margin",value:"18.4%"},{label:"Packages sold",value:"14"}],columns:["REPORT","PERIOD","AVAILABILITY"],rows:[
    {title:"Package profitability",subtitle:"Revenue less allocated supplier costs",detail:"This month",status:"Available",tone:"green" as const},
    {title:"Customer outstanding",subtitle:"Receivables by customer and package",detail:"As of today",status:"Available",tone:"green" as const},
    {title:"Supplier outstanding",subtitle:"Payables by supplier and due date",detail:"As of today",status:"Available",tone:"green" as const}]},
  settings: {title:"Settings",description:"Configure your agency profile, GST, currency, users and notification preferences.",action:"Save settings",metrics:[{label:"Default currency",value:"INR"},{label:"Time zone",value:"Asia/Kolkata"},{label:"GST configuration",value:"To configure"}],columns:["CONFIGURATION","DETAIL","STATUS"],rows:[
    {title:"Company profile",subtitle:"Agency name, address and contact details",detail:"Business setup",status:"To configure",tone:"amber" as const},
    {title:"GST & invoices",subtitle:"GSTIN, tax rates and invoice numbering",detail:"Finance setup",status:"To configure",tone:"amber" as const},
    {title:"Notifications",subtitle:"WhatsApp, email and SMS providers",detail:"Integrations",status:"Not connected",tone:"gray" as const}]}
} as const;

export function generateStaticParams() { return Object.keys(data).map(section => ({section})); }
export default function Page({ params }: { params: {section:string} }) {
 const {section}=params;
 const config=data[section as keyof typeof data];
 if(!config) notFound();
 return <SectionPage config={config}/>;
}
