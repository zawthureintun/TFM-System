import React, { useState, useEffect } from "react";
import { db } from './Firebase';
import { collection, query, where, getDocs } from "firebase/firestore";
import { Grid, Card, CardContent, Typography, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { styled } from "@mui/system";
import { set } from "date-fns";

const StyledCard = styled(Card)(({ theme }) => ({
 
  borderRadius: "12px",
  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  padding: theme.spacing(2),
  textAlign: "center",
}));

const ProfitLossDashboard = () => {
  const [startDate, setStartDate] = useState(new Date("2025-01-01"));
  const [endDate, setEndDate] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(50);

  // Fetch orders from Firebase
  const fetchOrders = async () => {
    setLoading(true);
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("date", ">=", startDate.toISOString().split("T")[0]),
      where("date", "<=", endDate.toISOString().split("T")[0])
    );
    const querySnapshot = await getDocs(q);
    const orderData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setOrders(orderData);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [startDate, endDate]);

  // Calculate summary metrics
  const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const totalCosts = orders.reduce((sum, order) => sum + (order.costAmount || 0), 0);
  const netProfitLoss = totalRevenue - totalCosts;
  const profitMargin = totalRevenue ? (netProfitLoss / totalRevenue) * 100 : 0;

  // Define table columns
  const columns = [
    { field: "orderId", headerName: "Order ID", width: 120 },
    { field: "date", headerName: "Date", width: 120,
        valueGetter: (params) => {
          const date = new Date(params.row.date);
          return date.toLocaleDateString("en-GB");
        }   
     },
    { field: "customerName", headerName: "Customer Name", width: 150 },
    { field: "itemName", headerName: "Item", width: 130 },
    { field: "description", headerName: "Description", width: 200 },
    { field: "formType", headerName: "Form Type", width: 120 },
    { field: "quantity", headerName: "Qty", width: 80 },
    { field: "price", headerName: "Price", width: 100 },
    { field: "amount", headerName: "Total Amount", width: 150 },
    { field: "costAmount", headerName: "Total Cost", width: 120 },
    {
      field: "netProfitLoss",
      headerName: "Net Profit/Loss",
      width: 130,
      valueGetter: (params) => params.row.amount - params.row.costAmount,
    },
  ];

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div style={{ padding: "10px", minHeight: "100vh" }}>
        <Typography variant="h4" gutterBottom align="center" color="primary">
          Profit/Loss Dashboard
        </Typography>

        {/* Date Pickers */}
        <Grid container spacing={2} justifyContent="center" sx={{ mb: 4,mt:2 }}>
          <Grid item>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              renderInput={(params) => <TextField {...params} />}
            />
          </Grid>
          <Grid item>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              renderInput={(params) => <TextField {...params} />}
            />
          </Grid>
        </Grid>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" color="textSecondary">Total Revenue</Typography>
                <Typography variant="h5" color="primary">{totalRevenue.toLocaleString()} MMK</Typography>
              </CardContent>
            </StyledCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" color="textSecondary">Total Costs</Typography>
                <Typography variant="h5" color="primary">{totalCosts.toLocaleString()} MMK</Typography>
              </CardContent>
            </StyledCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" color="textSecondary">Net Profit/Loss</Typography>
                <Typography variant="h5" color={netProfitLoss >= 0 ? "green" : "red"}>
                  {netProfitLoss.toLocaleString()} MMK
                </Typography>
              </CardContent>
            </StyledCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" color="textSecondary">Profit Margin</Typography>
                <Typography variant="h5" color="primary">{profitMargin.toFixed(2)}%</Typography>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>

        {/* Data Table */}
        <div style={{ height: 800, width: "100%", backgroundColor: "#fff", borderRadius: "12px" }}>
          <DataGrid
            rows={orders}
            columns={columns}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            rowsPerPageOptions={[5, 10, 25,50,100]}
            loading={loading}
            components={{ Toolbar: GridToolbar }}
            disableSelectionOnClick
            sx={{ boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}
          />
        </div>
      </div>
    </LocalizationProvider>
  );
};

export default ProfitLossDashboard;