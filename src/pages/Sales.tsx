import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Scan, 
  Plus, 
  Minus, 
  ShoppingCart, 
  CreditCard, 
  Banknote, 
  Smartphone,
  Trash2,
  Receipt,
  Users
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  barcode?: string;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  loyalty_points: number;
  is_student: boolean;
  total_spent: number;
}

export default function Sales() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mpesa'>('cash');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock_quantity', 0);
    
    setProducts(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .limit(50);
    
    setCustomers(data || []);
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock_quantity < quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.stock_quantity} items available`,
        variant: "destructive",
      });
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock_quantity) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${product.stock_quantity} items available`,
            variant: "destructive",
          });
          return prevCart;
        }
        
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
            : item
        );
      } else {
        return [...prevCart, { 
          ...product, 
          quantity, 
          total: quantity * product.price 
        }];
      }
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock_quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.stock_quantity} items available`,
        variant: "destructive",
      });
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const searchByBarcode = async () => {
    if (!barcode.trim()) return;

    const product = products.find(p => p.barcode === barcode.trim());
    if (product) {
      addToCart(product);
      setBarcode('');
      toast({
        title: "Product Added",
        description: `${product.name} added to cart`,
      });
    } else {
      toast({
        title: "Product Not Found",
        description: "No product found with this barcode",
        variant: "destructive",
      });
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.16; // 16% VAT
  };

  const calculateDiscount = (subtotal: number) => {
    if (selectedCustomer?.is_student) {
      return subtotal * 0.1; // 10% student discount
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const discount = calculateDiscount(subtotal);
    return subtotal + tax - discount;
  };

  const calculateLoyaltyPoints = () => {
    const total = calculateTotal();
    return Math.floor(total / 10); // 1 point per $10
  };

  const processTransaction = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before processing",
        variant: "destructive",
      });
      return;
    }

    if (!profile) return;

    setLoading(true);

    try {
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax(subtotal);
      const discountAmount = calculateDiscount(subtotal);
      const totalAmount = calculateTotal();
      const pointsEarned = calculateLoyaltyPoints();

      // Generate transaction number
      const { data: transactionNumber } = await supabase
        .rpc('generate_transaction_number');

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          transaction_number: transactionNumber,
          cashier_id: profile.id,
          customer_id: selectedCustomer?.id,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          points_earned: pointsEarned,
          status: 'completed'
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Add transaction items
      const transactionItems = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.total
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ 
            stock_quantity: item.stock_quantity - item.quantity 
          })
          .eq('id', item.id);
      }

      // Update customer loyalty points
      if (selectedCustomer && pointsEarned > 0) {
        await supabase
          .from('customers')
          .update({ 
            loyalty_points: selectedCustomer.loyalty_points + pointsEarned,
            total_spent: selectedCustomer.total_spent + totalAmount
          })
          .eq('id', selectedCustomer.id);
      }

      toast({
        title: "Transaction Successful",
        description: `Transaction ${transactionNumber} completed successfully`,
      });

      // Reset cart and refresh data
      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod('cash');
      fetchProducts();

    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction Failed",
        description: "Failed to process transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Product Selection */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Point of Sale</h1>
          <Badge variant="outline" className="text-sm">
            Cashier: {profile?.full_name}
          </Badge>
        </div>

        {/* Barcode Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Scan className="h-5 w-5" />
              <span>Barcode Scanner</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Scan or enter barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchByBarcode()}
              />
              <Button onClick={searchByBarcode}>
                <Scan className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-auto">
              {products.map((product) => (
                <Card key={product.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">{product.name}</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                      <Badge variant="secondary" className="text-xs">
                        Stock: {product.stock_quantity}
                      </Badge>
                    </div>
                    <Button 
                      onClick={() => addToCart(product)} 
                      size="sm" 
                      className="w-full"
                      disabled={product.stock_quantity === 0}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-96 bg-muted/20 border-l p-6 space-y-4">
        {/* Customer Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4" />
              <span>Customer</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={(value) => {
              const customer = customers.find(c => c.id === value);
              setSelectedCustomer(customer || null);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer (optional)" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.phone})
                    {customer.is_student && <Badge className="ml-2 text-xs">Student</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <div className="mt-2 p-2 bg-primary-light rounded text-sm">
                <div className="flex justify-between">
                  <span>Loyalty Points:</span>
                  <span className="font-semibold">{selectedCustomer.loyalty_points}</span>
                </div>
                {selectedCustomer.is_student && (
                  <div className="text-xs text-success mt-1">10% Student Discount Applied</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <ShoppingCart className="h-4 w-4" />
              <span>Cart ({cart.length} items)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-64 overflow-auto space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-card rounded border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <>
                <Separator />
                
                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (16%):</span>
                    <span>${calculateTax(calculateSubtotal()).toFixed(2)}</span>
                  </div>
                  {calculateDiscount(calculateSubtotal()) > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount:</span>
                      <span>-${calculateDiscount(calculateSubtotal()).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  {selectedCustomer && (
                    <div className="text-xs text-muted-foreground">
                      Loyalty points to earn: {calculateLoyaltyPoints()}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm">Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <Banknote className="h-3 w-3 mr-1" />
                      Cash
                    </Button>
                    <Button
                      variant={paymentMethod === 'card' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('card')}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Card
                    </Button>
                    <Button
                      variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('mpesa')}
                    >
                      <Smartphone className="h-3 w-3 mr-1" />
                      M-Pesa
                    </Button>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button 
                  onClick={processTransaction} 
                  className="w-full" 
                  size="lg"
                  disabled={loading}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : 'Complete Sale'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}