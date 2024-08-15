'use client';
import { useState, useEffect, useCallback } from "react";
import { firestore } from "@/firebase";
import { Box, Typography, Modal, Stack, TextField, Button, IconButton, Container, Paper, Alert, Divider, Skeleton } from "@mui/material";
import { AddCircleOutline, RemoveCircleOutline, DeleteForever, ArrowDownward, ArrowUpward, Edit } from '@mui/icons-material';
import { collection, setDoc, getDocs, getDoc, deleteDoc, query, doc } from "firebase/firestore";
import debounce from 'lodash/debounce';
import { FixedSizeList } from 'react-window';

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [originalInventory, setOriginalInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const updateInventory = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const snapshot = query(collection(firestore, 'inventory'));
      const docs = await getDocs(snapshot);
      const inventoryList = docs.docs.map(doc => ({
        name: doc.id,
        ...doc.data(),
      }));

      setOriginalInventory(inventoryList);
      // Update inventory directly without debouncing to ensure state consistency
      setInventory(filterInventory(inventoryList));
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setFetchError("Failed to load inventory. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sortInventory = (inventoryList) => {
    return [...inventoryList].sort((a, b) => {
      if (sortKey === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sortKey === 'quantity') {
        return sortOrder === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
      }
      return 0;
    });
  };

  const filterInventory = (inventoryList) => {
    if (!searchQuery.trim()) {
      return sortInventory(inventoryList);
    }

    const filteredList = inventoryList.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    return sortInventory(filteredList);
  };

  const addItem = async (item, quantity) => {
    if (!item.trim()) {
      setError('Item name is required');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const { quantity: currentQuantity } = docSnap.data();
        await setDoc(docRef, { quantity: currentQuantity + quantity }, { merge: true });
      } else {
        await setDoc(docRef, { quantity });
      }

      await updateInventory();
      handleClose();
    } catch (error) {
      console.error("Error adding item:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (item) => {
    setLoading(true);
    try {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        if (quantity === 1) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, { quantity: quantity - 1 }, { merge: true });
        }
      }
      await updateInventory();
    } catch (error) {
      console.error("Error removing item:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (item) => {
    setLoading(true);
    try {
      const docRef = doc(collection(firestore, 'inventory'), item);
      await deleteDoc(docRef);
      await updateInventory();
    } catch (error) {
      console.error("Error deleting item:", error);
    } finally {
      setLoading(false);
    }
  };

  const editItem = async (newItemName, newQuantity) => {
    if (newQuantity === '' || newQuantity <= 0) {
      setError('Quantity must be a positive integer');
      return;
    }

    setLoading(true);
    try {
      const oldItemName = editingItem;

      if (newItemName !== oldItemName) {
        const oldDocRef = doc(collection(firestore, 'inventory'), oldItemName);
        await deleteDoc(oldDocRef);

        const newDocRef = doc(collection(firestore, 'inventory'), newItemName);
        await setDoc(newDocRef, { quantity: newQuantity });
      } else {
        const docRef = doc(collection(firestore, 'inventory'), oldItemName);
        await setDoc(docRef, { quantity: newQuantity }, { merge: true });
      }

      await updateInventory();
      handleClose();
    } catch (error) {
      console.error("Error editing item:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortKey(key);
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
  };

  useEffect(() => {
    updateInventory(); // Fetch inventory on mount
  }, []);

  useEffect(() => {
    if (originalInventory.length > 0) {
      debouncedUpdateInventory(); // Update inventory based on filters and search query
    }
  }, [searchQuery, sortKey, sortOrder, originalInventory]);

  const debouncedUpdateInventory = useCallback(
    debounce(() => {
      try {
        const filteredInventory = filterInventory(originalInventory);
        setInventory(filteredInventory);
      } catch (error) {
        console.error("Error updating inventory:", error);
      }
    }, 300), // Debounce delay of 300ms
    [searchQuery, sortKey, sortOrder, originalInventory]
  );

  const handleOpen = (itemName = '') => {
    setItemName(itemName);
    setQuantity(1);
    setError('');
    setOpen(true);
    if (itemName) {
      setEditingItem(itemName);
    }
  };

  const handleClose = () => {
    setItemName('');
    setQuantity(1);
    setError('');
    setOpen(false);
    setEditingItem(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (editingItem) {
        editItem(itemName, quantity);
      } else {
        addItem(itemName, quantity);
      }
    }
  };

  const SkeletonLoader = () => (
    <Box display="flex" alignItems="center" justifyContent="space-between" p={2} borderBottom="1px solid #ddd">
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" width="20%" />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="circular" width={24} height={24} />
      </Stack>
    </Box>
  );

  const ItemRenderer = ({ index, style }) => {
    const item = inventory[index];
    return (
      <Box key={item.name} display="flex" alignItems="center" justifyContent="space-between" p={2} borderBottom="1px solid #ddd" style={style}>
        <Typography sx={{ flex: 1, textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.name}</Typography>
        <Typography sx={{ width: 100, textAlign: 'left' }}>{item.quantity}</Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => handleOpen(item.name)} color="primary">
            <Edit />
          </IconButton>
          <IconButton onClick={() => addItem(item.name, 1)} color="white">
            <AddCircleOutline />
          </IconButton>
          <IconButton onClick={() => removeItem(item.name)} color="primary">
            <RemoveCircleOutline />
          </IconButton>
          <IconButton onClick={() => deleteItem(item.name)} color="error">
            <DeleteForever />
          </IconButton>
        </Stack>
      </Box>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 2, overflow: 'auto' }}>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="flex-start"
        alignItems="center"
        minHeight="calc(100vh - 40px)" // Subtracts some space for potential margins/padding
        gap={2}
        py={2}
        className="container"
      >
        <Box className="greeting-container">
          <Typography variant="h6" color="textSecondary" className="date-text">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </Typography>
          <Typography variant="h4" className="greeting-text">
            <span className="greeting-highlight" font="italic">Inventory</span>
          </Typography>
          <Typography variant="h5" textAlign="center" className="slogan">
            Made easier.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => handleOpen()}
          startIcon={<AddCircleOutline />}
          className="add-item-button"
        >
          Add New Item
        </Button>
        <Modal open={open} onClose={handleClose}>
          <Box className="modal-box">
            <Typography variant="h6" component="h2" textAlign="center" className="modal-title">
              {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              label="Item Name"
              variant="outlined"
              fullWidth
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={handleKeyPress}
              autoFocus
              sx={{
                "& .MuiInputBase-input": {
                  color: 'white',
                },
                "& .MuiInputLabel-root": {
                  color: 'white',
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: 'white',
                  },
                  "&:hover fieldset": {
                    borderColor: 'white',
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: 'white',
                  },
                },
              }}
              className="modal-input"
              error={Boolean(error)}
              helperText={error}
            />
            <TextField
              label="Quantity"
              variant="outlined"
              type="number"
              fullWidth
              value={quantity}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setQuantity('');
                } else {
                  const parsedValue = parseInt(value, 10);
                  setQuantity(isNaN(parsedValue) || parsedValue <= 0 ? '' : parsedValue);
                }
              }}
              onKeyDown={handleKeyPress}
              sx={{
                "& .MuiInputBase-input": {
                  color: 'white',
                },
                "& .MuiInputLabel-root": {
                  color: 'white',
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: 'white',
                  },
                  "&:hover fieldset": {
                    borderColor: 'white',
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: 'white',
                  },
                },
              }}
              className="modal-input"
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => {
                if (editingItem) {
                  editItem(itemName, quantity);
                } else {
                  addItem(itemName, quantity);
                }
              }}
              className="add-item-button"
              disabled={!itemName.trim() || quantity === '' || quantity <= 0}
            >
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </Box>
        </Modal>

        <Paper elevation={3} className="inventory-paper">
          <Box display="flex" flexDirection="column" p={0}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" p={2} className="inventory-header">
              <Stack direction="row" display="flex" alignItems="center" spacing={1}>
                <TextField
                  variant="outlined"
                  placeholder="Search items"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  sx={{
                    "& .MuiInputBase-input": {
                      color: 'white',
                    },
                    "& .MuiInputLabel-root": {
                      color: 'white',
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: 'white',
                      },
                      "&:hover fieldset": {
                        borderColor: 'white',
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: 'white',
                      },
                    },
                    minHeight: 1,
                    minWidth: 600
                  }}
                  className="search-bar"
                />

                <IconButton onClick={() => handleSort('name')} color="primary">
                  {sortKey === 'name' && sortOrder === 'asc' ?
                    <ArrowUpward sx={{ color: 'white' }} /> :
                    sortKey === 'name' && sortOrder === 'desc' ?
                      <ArrowDownward sx={{ color: 'white' }} /> :
                      <ArrowUpward sx={{ color: 'white' }} />
                  }
                  <Typography variant="caption" color="white">Name</Typography>
                </IconButton>
              </Stack>
              <Stack direction="row" display="flex" alignItems="center" spacing={1}>
                <IconButton onClick={() => handleSort('quantity')} color="primary">
                  {sortKey === 'quantity' && sortOrder === 'asc' ?
                    <ArrowUpward sx={{ color: 'white' }} /> :
                    sortKey === 'quantity' && sortOrder === 'desc' ?
                      <ArrowDownward sx={{ color: 'white' }} /> :
                      <ArrowUpward sx={{ color: 'white' }} />
                  }
                  <Typography variant="caption" color="white" sx={{ width: -700, textAlign: 'left' }}>Quantity</Typography>
                </IconButton>
              </Stack>
            </Stack>

            <Divider />
            <Box p={2} className="inventory-list" sx={{ height: 'auto', maxHeight: 400, overflowY: 'hidden' }}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => <SkeletonLoader key={index} />)
              ) : fetchError ? (
                <Typography color="error" display="flex" alignItems="center" justifyContent="center">
                  {fetchError}
                </Typography>
              ) : inventory.length > 0 ? (
                <FixedSizeList
                  height={Math.min(inventory.length * 60, 400)} // Adjust height based on item size and count
                  width="100%"
                  itemSize={60}
                  itemCount={inventory.length}
                  overscanCount={5}
                >
                  {ItemRenderer}
                </FixedSizeList>
              ) : (
                <Typography display="flex" alignItems="center" justifyContent="center">No items found</Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}