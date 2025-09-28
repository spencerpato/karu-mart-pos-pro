import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  UserCheck,
  TrendingUp,
  Award
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier'] },
  { name: 'Sales', href: '/sales', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'] },
  { name: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'manager'] },
  { name: 'Customers', href: '/customers', icon: Users, roles: ['admin', 'manager', 'cashier'] },
  { name: 'Loyalty', href: '/loyalty', icon: Award, roles: ['admin', 'manager', 'cashier'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
  { name: 'Users', href: '/users', icon: UserCheck, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'manager'] },
];

export const Sidebar = ({ className }: SidebarProps) => {
  const { profile, signOut, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredNavigation = navigation.filter(item => 
    hasRole(item.roles)
  );

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <div className={cn("flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border", className)}>
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">KarU Mart</h2>
            <p className="text-xs text-sidebar-foreground/70">POS System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/70 capitalize">
              {profile?.role || 'cashier'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Button
              key={item.name}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start px-3 py-2 text-sm transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4">
        <Button
          variant="ghost"
          className="w-full justify-start px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};