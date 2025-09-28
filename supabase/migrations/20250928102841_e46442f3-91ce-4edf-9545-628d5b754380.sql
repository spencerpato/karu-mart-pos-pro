-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier');

-- Create enum for payment methods
CREATE TYPE payment_method AS ENUM ('cash', 'mpesa', 'card');

-- Create enum for transaction status
CREATE TYPE transaction_status AS ENUM ('completed', 'cancelled', 'refunded');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  cost_price DECIMAL(10,2) CHECK (cost_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table for loyalty system
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  loyalty_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  is_student BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  cashier_id UUID NOT NULL REFERENCES public.profiles(id),
  customer_id UUID REFERENCES public.customers(id),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method payment_method NOT NULL,
  status transaction_status NOT NULL DEFAULT 'completed',
  points_earned INTEGER NOT NULL DEFAULT 0,
  points_redeemed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE public.transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for categories (admin/manager only)
CREATE POLICY "Staff can view categories" ON public.categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admin/Manager can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create RLS policies for products
CREATE POLICY "Staff can view products" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admin/Manager can manage products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create RLS policies for customers
CREATE POLICY "Staff can view customers" ON public.customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Staff can manage customers" ON public.customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create RLS policies for transactions
CREATE POLICY "Staff can view transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Staff can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admin/Manager can update transactions" ON public.transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Create RLS policies for transaction_items
CREATE POLICY "Staff can view transaction items" ON public.transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Staff can manage transaction items" ON public.transaction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    'cashier'
  );
  RETURN new;
END;
$$;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample categories
INSERT INTO public.categories (name, description) VALUES
  ('Electronics', 'Electronic devices and accessories'),
  ('Groceries', 'Food and household items'),
  ('Beverages', 'Drinks and beverages'),
  ('Snacks', 'Chips, cookies, and snack items'),
  ('Dairy', 'Milk, cheese, and dairy products'),
  ('Household', 'Cleaning and household supplies');

-- Insert sample products
INSERT INTO public.products (name, barcode, category_id, price, cost_price, stock_quantity, min_stock_level, description) VALUES
  ('Coca Cola 500ml', '1234567890123', (SELECT id FROM public.categories WHERE name = 'Beverages'), 1.50, 1.00, 50, 10, 'Refreshing cola drink'),
  ('White Bread', '2345678901234', (SELECT id FROM public.categories WHERE name = 'Groceries'), 2.00, 1.20, 30, 5, 'Fresh white bread loaf'),
  ('Samsung Galaxy Earbuds', '3456789012345', (SELECT id FROM public.categories WHERE name = 'Electronics'), 150.00, 100.00, 15, 3, 'Wireless bluetooth earbuds'),
  ('Milk 1L', '4567890123456', (SELECT id FROM public.categories WHERE name = 'Dairy'), 3.00, 2.50, 25, 5, 'Fresh whole milk'),
  ('Pringles Original', '5678901234567', (SELECT id FROM public.categories WHERE name = 'Snacks'), 4.50, 3.00, 40, 10, 'Original flavor potato crisps'),
  ('Dish Soap', '6789012345678', (SELECT id FROM public.categories WHERE name = 'Household'), 5.00, 3.50, 20, 5, 'Liquid dish washing soap');

-- Insert sample customers
INSERT INTO public.customers (name, phone, email, loyalty_points, is_student) VALUES
  ('John Doe', '+254700123456', 'john.doe@email.com', 150, false),
  ('Mary Student', '+254700987654', 'mary.student@university.ac.ke', 80, true),
  ('Peter Smith', '+254700555666', 'peter.smith@email.com', 220, false);

-- Create indexes for better performance
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_transactions_cashier ON public.transactions(cashier_id);
CREATE INDEX idx_transactions_date ON public.transactions(created_at);
CREATE INDEX idx_transaction_items_transaction ON public.transaction_items(transaction_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- Create function to generate transaction number
CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  counter INTEGER;
  today_date TEXT;
BEGIN
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO counter
  FROM public.transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  RETURN 'TXN-' || today_date || '-' || LPAD(counter::TEXT, 4, '0');
END;
$$;