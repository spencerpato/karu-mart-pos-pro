import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  todaySales: number;
  totalRevenue: number;
  totalTransactions: number;
  lowStockItems: number;
  totalCustomers: number;
  topSellingProduct: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    topSellingProduct: 'Loading...'
  });
  const [loading, setLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select('total_amount')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
        .eq('status', 'completed');

      const todaySales = todayTransactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

      // Get total revenue
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('status', 'completed');

      const totalRevenue = allTransactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

      // Get transaction count
      const totalTransactions = allTransactions?.length || 0;

      // Get customer count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get low stock items
      const { data: lowStock, count: lowStockCount } = await supabase
        .from('products')
        .select('id, name, stock_quantity, min_stock_level')
        .lt('stock_quantity', 'min_stock_level')
        .eq('is_active', true);

      setLowStockProducts(lowStock || []);

      // Get top selling product (simplified for demo)
      const { data: topProduct } = await supabase
        .from('products')
        .select('name')
        .limit(1);

      setStats({
        todaySales,
        totalRevenue,
        totalTransactions,
        lowStockItems: lowStockCount || 0,
        totalCustomers: customerCount || 0,
        topSellingProduct: topProduct?.[0]?.name || 'No data'
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {profile?.full_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome to your KarU Mart POS dashboard
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{getCurrentDate()}</span>
          </div>
          <div className="flex items-center space-x-2 text-lg font-semibold">
            <Clock className="h-4 w-4" />
            <span>{getCurrentTime()}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          onClick={() => navigate('/sales')} 
          className="h-16 text-lg font-semibold bg-gradient-primary hover:opacity-90"
        >
          <ShoppingCart className="mr-3 h-6 w-6" />
          New Sale
        </Button>
        {profile?.role !== 'cashier' && (
          <Button 
            onClick={() => navigate('/inventory')} 
            variant="outline"
            className="h-16 text-lg font-semibold border-2"
          >
            <Package className="mr-3 h-6 w-6" />
            Manage Inventory
          </Button>
        )}
        <Button 
          onClick={() => navigate('/customers')} 
          variant="outline"
          className="h-16 text-lg font-semibold border-2"
        >
          <Users className="mr-3 h-6 w-6" />
          Customer Lookup
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Today's Sales"
          value={`$${stats.todaySales.toFixed(2)}`}
          change={{ value: 12, label: 'from yesterday', type: 'positive' }}
          icon={DollarSign}
          className="border-l-4 border-l-primary"
        />
        <StatsCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          change={{ value: 8, label: 'from last month', type: 'positive' }}
          icon={TrendingUp}
          className="border-l-4 border-l-success"
        />
        <StatsCard
          title="Transactions"
          value={stats.totalTransactions}
          change={{ value: 5, label: 'from yesterday', type: 'positive' }}
          icon={ShoppingCart}
          className="border-l-4 border-l-warning"
        />
        <StatsCard
          title="Customers"
          value={stats.totalCustomers}
          change={{ value: 3, label: 'new this week', type: 'positive' }}
          icon={Users}
          className="border-l-4 border-l-accent"
        />
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card className="border-l-4 border-l-warning">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span>Low Stock Alert</span>
              {stats.lowStockItems > 0 && (
                <Badge variant="secondary" className="bg-warning/20 text-warning">
                  {stats.lowStockItems} items
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex justify-between items-center py-1">
                    <span className="text-sm">{product.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {product.stock_quantity} left
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{lowStockProducts.length - 5} more items
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All items are well stocked!</p>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Product */}
        <Card className="border-l-4 border-l-success">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <span>Performance Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Top Selling Product</p>
                <p className="font-semibold">{stats.topSellingProduct}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Sale</p>
                <p className="font-semibold">
                  ${stats.totalTransactions > 0 ? (stats.totalRevenue / stats.totalTransactions).toFixed(2) : '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <Badge className="bg-success text-success-foreground">
                  Online & Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}