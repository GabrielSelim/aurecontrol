import { useAuth } from "@/contexts/AuthContext";
import DashboardOverview from "./DashboardOverview";
import MasterAdminOverview from "./MasterAdminOverview";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const DashboardHome = () => {
  useDocumentTitle("Dashboard");
  const { hasRole } = useAuth();
  
  if (hasRole("master_admin")) {
    return <MasterAdminOverview />;
  }
  
  return <DashboardOverview />;
};

export default DashboardHome;
