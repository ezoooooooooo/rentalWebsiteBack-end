const User = require("../Models/userModel");
const Order = require("../Models/Order");
const Listing = require("../Models/Listing");
const Notification = require("../Models/Notification");

// Dashboard overview statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get current date and calculate date ranges
    const currentDate = new Date();
    
    // Start of today
    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    
    // Start of this month
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Start of this year
    const yearStart = new Date(currentDate.getFullYear(), 0, 1);

    // Count users
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: todayStart } });
    
    // Count orders
    const totalOrders = await Order.countDocuments();
    const ordersToday = await Order.countDocuments({ createdAt: { $gte: todayStart } });
    
    // Count listings
    const totalListings = await Listing.countDocuments();
    const activeListings = await Listing.countDocuments({ status: "available" });
    
    // Calculate revenue - show all-time revenue since system date is wrong
    
    // Get all-time revenue instead of monthly due to date issue
    const allTimeRevenueResult = await Order.aggregate([
      { 
        $match: { 
          status: { $in: ["approved", "completed"] }
        }
      },
      { 
        $group: { 
          _id: null, 
          totalRevenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } },
          count: { $sum: 1 }
        } 
      }
    ]);
    
    const monthlyRevenue = allTimeRevenueResult.length > 0 ? allTimeRevenueResult[0].totalRevenue : 0;
    const monthlyOrderCount = allTimeRevenueResult.length > 0 ? allTimeRevenueResult[0].count : 0;
    
    // Status counts
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const approvedOrders = await Order.countDocuments({ status: "approved" });
    const completedOrders = await Order.countDocuments({ status: "completed" });
    const rejectedOrders = await Order.countDocuments({ status: "rejected" });
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" });

    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday
      },
      orders: {
        total: totalOrders,
        today: ordersToday,
        pending: pendingOrders,
        approved: approvedOrders,
        completed: completedOrders,
        rejected: rejectedOrders,
        cancelled: cancelledOrders
      },
      listings: {
        total: totalListings,
        active: activeListings
      },
      revenue: {
        monthly: monthlyRevenue
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching dashboard statistics", error: error.message });
  }
};

// Order Management
exports.getAllOrders = async (req, res) => {
  try {
    const { status, startDate, endDate, userId, page = 1, limit = 20, sort = "-createdAt" } = req.query;
    
    // Build query filters
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (userId) {
      query.user = userId;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination and sorting
    const orders = await Order.find(query)
      .populate("user", "firstName lastName email")
      .populate("listing", "name images rentalRate category")
      .populate("owner", "firstName lastName email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);
    
    res.json({
      orders,
      pagination: {
        total: totalOrders,
        page: parseInt(page),
        pages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ message: "Error fetching orders", error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order status
    order.status = status;
    
    // Handle listing status updates based on order status
    const listing = await Listing.findById(order.listing);
    if (listing) {
      if (status === "approved") {
        listing.status = "rented";
      } else if (status === "rejected" || status === "cancelled" || status === "completed") {
        listing.status = "available";
        listing.reservedUntil = null;
        
        if (status === "rejected" || status === "cancelled") {
          order.isActive = false;
        }
      }
      await listing.save();
    }
    
    await order.save();

    // Create notification for the user
    const notification = new Notification({
      recipient: order.user,
      sender: req.user.userId,
      type: `order_${status}`,
      order: order._id,
      message: `Your order for ${listing ? listing.name : 'the item'} has been ${status}${note ? ': ' + note : ''}`,
    });

    await notification.save();

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Error updating order status", error: error.message });
  }
};

// Batch update order statuses
exports.batchUpdateOrders = async (req, res) => {
  try {
    const { orderIds, status, note } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "No order IDs provided" });
    }
    
    // Update orders
    const updateResults = await Promise.all(
      orderIds.map(async (orderId) => {
        try {
          const order = await Order.findById(orderId);
          if (!order) {
            return { orderId, success: false, message: "Order not found" };
          }
          
          // Update order status
          order.status = status;
          
          // Handle listing status updates
          const listing = await Listing.findById(order.listing);
          if (listing) {
            if (status === "approved") {
              listing.status = "rented";
            } else if (status === "rejected" || status === "cancelled" || status === "completed") {
              listing.status = "available";
              listing.reservedUntil = null;
              
              if (status === "rejected" || status === "cancelled") {
                order.isActive = false;
              }
            }
            await listing.save();
          }
          
          await order.save();
          
          // Create notification
          const notification = new Notification({
            recipient: order.user,
            sender: req.user.userId,
            type: `order_${status}`,
            order: order._id,
            message: `Your order for ${listing ? listing.name : 'the item'} has been ${status}${note ? ': ' + note : ''}`,
          });
          
          await notification.save();
          
          return { orderId, success: true };
        } catch (error) {
          return { orderId, success: false, message: error.message };
        }
      })
    );
    
    res.json({
      message: "Batch update completed",
      results: updateResults
    });
  } catch (error) {
    console.error("Error in batch update:", error);
    res.status(500).json({ message: "Error updating orders", error: error.message });
  }
};

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20, sort = "-createdAt" } = req.query;
    
    // Build query filters
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      // Search by name, email, or username
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination and sorting
    const users = await User.find(query)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Special case for analytics - redirect to appropriate analytics endpoint
    if (userId === 'analytics') {
      return res.status(400).json({ 
        message: "Invalid user ID. If you're trying to access analytics, use /admin/analytics/* endpoints instead." 
      });
    }
    
    const user = await User.findById(userId)
      .select("-password -resetPasswordToken -resetPasswordExpires");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get user's listings
    const listings = await Listing.find({ owner: userId });
    
    // Get user's orders (as renter)
    const ordersAsRenter = await Order.find({ user: userId })
      .populate("listing", "name images rentalRate")
      .populate("owner", "firstName lastName");
    
    // Get user's orders (as owner)
    const ordersAsOwner = await Order.find({ owner: userId })
      .populate("listing", "name images rentalRate")
      .populate("user", "firstName lastName");
    
    res.json({
      user,
      activity: {
        listings: {
          count: listings.length,
          items: listings
        },
        ordersAsRenter: {
          count: ordersAsRenter.length,
          items: ordersAsRenter
        },
        ordersAsOwner: {
          count: ordersAsOwner.length,
          items: ordersAsOwner
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Error fetching user details", error: error.message });
  }
};

// User Management Functions
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    user.role = role;
    await user.save();
    
    res.json({
      message: `User role updated to ${role}`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Error updating user role", error: error.message });
  }
};

// Listing Management Functions
exports.getAllListings = async (req, res) => {
  try {
    const { status, search, ownerId, page = 1, limit = 20, sort = "-createdAt" } = req.query;
    
    // Build query filters
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (ownerId) {
      query.owner = ownerId;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query with pagination and sorting
    const listings = await Listing.find(query)
      .populate("owner", "firstName lastName email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalListings = await Listing.countDocuments(query);
    
    res.json({
      listings,
      pagination: {
        total: totalListings,
        page: parseInt(page),
        pages: Math.ceil(totalListings / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ message: "Error fetching listings", error: error.message });
  }
};

exports.updateListingStatus = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { status, featured } = req.body;
    
    const listing = await Listing.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    
    // Update status if provided
    if (status) {
      listing.status = status;
    }
    
    // Update featured status if provided
    if (featured !== undefined) {
      listing.featured = featured;
    }
    
    await listing.save();
    
    // If setting to unavailable, cancel any pending orders
    if (status === "unavailable") {
      const pendingOrders = await Order.find({ 
        listing: listingId, 
        status: "pending",
        isActive: true
      });
      
      for (const order of pendingOrders) {
        order.status = "cancelled";
        order.isActive = false;
        await order.save();
        
        // Create notification
        const notification = new Notification({
          recipient: order.user,
          sender: req.user.userId,
          type: "order_cancelled",
          order: order._id,
          message: `Your order has been cancelled because the listing is no longer available.`,
        });
        
        await notification.save();
      }
    }
    
    res.json({
      message: "Listing updated successfully",
      listing
    });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ message: "Error updating listing", error: error.message });
  }
};

// Revenue Analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = "monthly", year = new Date().getFullYear(), month, days = 365 } = req.query; // Default to 1 year
    
    let matchStage = {};
    let groupStage = {};
    
    // Only include completed and approved orders for revenue calculation
    matchStage.status = { $in: ["approved", "completed"] };
    
    if (period === "daily") {
      // Daily breakdown - use days parameter or specific month
      if (month) {
        const monthNum = parseInt(month) - 1; // JavaScript months are 0-indexed
        matchStage.createdAt = {
          $gte: new Date(year, monthNum, 1),
          $lt: new Date(year, monthNum + 1, 1)
        };
        
        groupStage = {
          _id: { $dayOfMonth: "$createdAt" },
          revenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } },
          count: { $sum: 1 }
        };
      } else {
        // Last N days
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - parseInt(days));
        
        matchStage.createdAt = { $gte: startDate, $lt: endDate };
        
        groupStage = {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          revenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } },
          count: { $sum: 1 }
        };
      }
    } else if (period === "monthly") {
      // Monthly breakdown for a year
      matchStage.createdAt = {
        $gte: new Date(year, 0, 1),
        $lt: new Date(parseInt(year) + 1, 0, 1)
      };
      
      groupStage = {
        _id: { $month: "$createdAt" },
        revenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } },
        count: { $sum: 1 }
      };
    } else if (period === "yearly") {
      // Yearly breakdown
      groupStage = {
        _id: { $year: "$createdAt" },
        revenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } },
        count: { $sum: 1 }
      };
    }
    
    const result = await Order.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { _id: 1 } }
    ]);
    
    // Format the response based on period type
    let formattedResult;
    if (period === "daily" && !month) {
      // Format for daily with date range
      formattedResult = result.map(item => ({
        date: new Date(item._id.year, item._id.month - 1, item._id.day).toISOString().split('T')[0],
        revenue: item.revenue,
        orderCount: item.count
      }));
    } else {
      // Format for other periods
      formattedResult = result.map(item => ({
        period: item._id,
        revenue: item.revenue,
        orderCount: item.count
      }));
    }
    
    // Calculate totals and previous period for comparison
    const totalRevenue = result.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = result.reduce((sum, item) => sum + item.count, 0);
    
    res.json({
      analytics: formattedResult,
      totalRevenue,
      totalOrders,
      metadata: {
        period,
        year,
        month: month ? parseInt(month) : undefined,
        days: period === "daily" && !month ? parseInt(days) : undefined
      }
    });
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    res.status(500).json({ message: "Error fetching revenue analytics", error: error.message });
  }
};

// Popular Listings Analytics
exports.getPopularListings = async (req, res) => {
  try {
    const { timeframe = "all", limit = 10 } = req.query; // Default to all-time to catch existing orders
    
    // Determine date range based on timeframe
    const now = new Date();
    let startDate;
    
    if (timeframe === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === "month") {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === "year") {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(0); // All time
    }
    
    // Aggregate to find most ordered listings - only approved/completed orders
    const popularListings = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          status: { $in: ["approved", "completed"] }
        } 
      },
      { 
        $group: { 
          _id: "$listing",
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } }
        } 
      },
      { $sort: { orderCount: -1 } },
      { $limit: parseInt(limit) }
    ]);
    
    // Get full listing details
    const listingIds = popularListings.map(item => item._id);
    const listingDetails = await Listing.find({ _id: { $in: listingIds } })
      .populate("owner", "firstName lastName");
    
    // Merge the data
    const result = popularListings.map(item => {
      const listingDetail = listingDetails.find(l => l._id.toString() === item._id.toString());
      return {
        listing: listingDetail,
        orderCount: item.orderCount,
        totalRevenue: item.totalRevenue
      };
    });
    
    res.json({
      popularListings: result,
      timeframe
    });
  } catch (error) {
    console.error("Error fetching popular listings:", error);
    res.status(500).json({ message: "Error fetching popular listings", error: error.message });
  }
};

// User Activity Stats
exports.getUserActivityStats = async (req, res) => {
  try {
    const { period = "daily", days = 365 } = req.query; // Default to 1 year to catch existing orders
    
    // Calculate start date based on period
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === "daily") {
      startDate.setDate(endDate.getDate() - parseInt(days));
    } else if (period === "weekly") {
      startDate.setDate(endDate.getDate() - (parseInt(days) * 7));
    } else if (period === "monthly") {
      startDate.setMonth(endDate.getMonth() - parseInt(days));
    }
    
    // User registrations over time
    let groupBy;
    if (period === "daily") {
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" }
      };
    } else if (period === "weekly") {
      groupBy = {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" }
      };
    } else if (period === "monthly") {
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      };
    }
    
    const userRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
    ]);
    
    // Order activity over time - only approved/completed orders
    const orderActivity = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["approved", "completed"] }
        } 
      },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
    ]);
    
    // Listing creation over time
    const listingActivity = await Listing.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
    ]);
    
    // Format the data for the frontend
    const formatDate = (item) => {
      if (period === "daily") {
        return new Date(item._id.year, item._id.month - 1, item._id.day).toISOString().split('T')[0];
      } else if (period === "weekly") {
        return `${item._id.year}-W${item._id.week}`;
      } else {
        return `${item._id.year}-${item._id.month}`;
      }
    };
    
    // Calculate new users in the period
    const newUsers = userRegistrations.reduce((sum, item) => sum + item.count, 0);
    
    // Calculate active users (from orders) - only approved/completed orders
    const activeUsers = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["approved", "completed"] }
        } 
      },
      { $group: { _id: "$user" } },
      { $count: "count" }
    ]);
    
    // Calculate conversion rate
    const totalUsers = await User.countDocuments();
    const usersWithOrders = await Order.aggregate([
      { $match: { status: { $in: ["approved", "completed"] } } },
      { $group: { _id: "$user" } },
      { $count: "count" }
    ]);
    
    const conversionRate = totalUsers > 0 ? 
      (usersWithOrders.length > 0 ? usersWithOrders[0].count : 0) / totalUsers * 100 : 0;
    
    // Format daily activity for the chart
    const dailyActivity = userRegistrations.map(item => {
      const date = formatDate(item);
      const orderData = orderActivity.find(o => formatDate(o) === date);
      const listingData = listingActivity.find(l => formatDate(l) === date);
      
      return {
        date,
        newUsers: item.count,
        activeUsers: orderData ? orderData.count : 0,
        newListings: listingData ? listingData.count : 0
      };
    });
    
    res.json({
      period,
      timeRange: {
        start: startDate,
        end: endDate
      },
      newUsers,
      activeUsers: activeUsers.length > 0 ? activeUsers[0].count : 0,
      conversionRate,
      dailyActivity
    });
  } catch (error) {
    console.error("Error fetching user activity stats:", error);
    res.status(500).json({ message: "Error fetching user activity stats", error: error.message });
  }
};

// Category Performance Analytics
exports.getCategoryPerformance = async (req, res) => {
  try {
    const { days = 365 } = req.query; // Default to 1 year to catch existing orders
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    // First, let's check if we have any orders in this period
    const totalOrdersInPeriod = await Order.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
      status: { $in: ["approved", "completed"] }
    });
    
    // Also check total orders without status filter
    const totalOrdersAnyStatus = await Order.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate }
    });
    
    // Check all orders regardless of date
    const totalOrdersEver = await Order.countDocuments({
      status: { $in: ["approved", "completed"] }
    });
    
    // Try broader category performance query first (all approved/completed orders ever)
    const categoryPerformanceAll = await Order.aggregate([
      { 
        $match: { 
          status: { $in: ["approved", "completed"] }
        } 
      },
      { $lookup: { from: "listings", localField: "listing", foreignField: "_id", as: "listingDetails" } },
      { $unwind: "$listingDetails" },
      { 
        $group: { 
          _id: "$listingDetails.category",
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } }
        } 
      },
      { $sort: { revenue: -1 } }
    ]);
    
    // Now try with date filter
    const categoryPerformance = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lt: endDate },
          status: { $in: ["approved", "completed"] }
        } 
      },
      { $lookup: { from: "listings", localField: "listing", foreignField: "_id", as: "listingDetails" } },
      { $unwind: "$listingDetails" },
      { 
        $group: { 
          _id: "$listingDetails.category",
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } }
        } 
      },
      { $sort: { revenue: -1 } }
    ]);
    
    // Use broader data if filtered data is empty
    const finalData = categoryPerformance.length > 0 ? categoryPerformance : categoryPerformanceAll;
    
    // Format the response
    const formattedResult = finalData.map(item => ({
      category: item._id || "Uncategorized",
      orders: item.orders,
      revenue: item.revenue
    }));
    
    res.json({
      categoryPerformance: formattedResult,
      totalOrdersInPeriod,
      totalOrdersEver,
      usedAllTimeData: categoryPerformance.length === 0,
      timeRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error("Error fetching category performance:", error);
    res.status(500).json({ message: "Error fetching category performance", error: error.message });
  }
};

// Order Status Analytics
exports.getOrderStatus = async (req, res) => {
  try {
    const { days = 365 } = req.query; // Default to 1 year to catch existing orders
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    // Check total orders in period
    const totalOrdersInPeriod = await Order.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate }
    });
    
    // Get order status counts (try all time first)
    const orderStatusCountsAllTime = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get order status counts for the period
    const orderStatusCounts = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Calculate revenue by status - only for approved/completed
    const revenueByStatus = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lt: endDate },
          status: { $in: ["approved", "completed"] }
        } 
      },
      { 
        $group: { 
          _id: "$status", 
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$insuranceFee", { $multiply: ["$totalPrice", 0.1] }] } }
        } 
      },
      { $sort: { revenue: -1 } }
    ]);
    
    // Use all-time data if period data is empty
    const finalStatusCounts = orderStatusCounts.length > 0 ? orderStatusCounts : orderStatusCountsAllTime;
    
    // Format the response
    const formattedStatusCounts = finalStatusCounts.map(item => ({
      status: item._id,
      count: item.count
    }));
    
    const formattedRevenueByStatus = revenueByStatus.map(item => ({
      status: item._id,
      count: item.count,
      revenue: item.revenue
    }));
    
    res.json({
      orderStatusCounts: formattedStatusCounts,
      revenueByStatus: formattedRevenueByStatus,
      totalOrdersInPeriod,
      usedAllTimeData: orderStatusCounts.length === 0,
      timeRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error("Error fetching order status counts:", error);
    res.status(500).json({ message: "Error fetching order status counts", error: error.message });
  }
};
