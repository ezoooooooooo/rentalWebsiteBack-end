# Testing the Rating Systems

This guide explains how to test the rating systems for both listings and owners before integrating with the frontend.

## Prerequisites

- Your backend server is running
- You have MongoDB running
- You have at least one user account, one listing, and one owner in your database

## Setup

1. Install the required dependencies:
   ```
   npm install axios --save-dev
   ```

2. Edit the `test-ratings.js` file and update the following information:
   - `TEST_USER` - Use a valid email and password from your database
   - `TEST_LISTING_ID` - Use a real listing ID from your database
   - `TEST_OWNER_ID` - Use a real owner ID from your database
   - Verify the login endpoint at line 48 matches your actual login endpoint

## Run the tests

Execute the test script with:

```
node test-ratings.js
```

## What gets tested

The script tests all CRUD operations for both rating systems:

### Listing Ratings Test
1. Create a new rating for a listing
2. Get all ratings for a specific listing
3. Update a rating
4. Delete a rating

### Owner Ratings Test
1. Create a new rating for an owner
2. Get all ratings for a specific owner
3. Update an owner rating
4. Delete an owner rating

## How to use Postman for manual testing

You can also test the API endpoints manually using Postman:

### Listing Rating Endpoints

**Create a listing rating**
- POST http://localhost:3000/api/ratings
- Body:
  ```json
  {
    "listingId": "YOUR_LISTING_ID",
    "score": 4,
    "comment": "This item was in great condition!"
  }
  ```

**Get ratings for a listing**
- GET http://localhost:3000/api/ratings/listing/YOUR_LISTING_ID

**Update a rating**
- PUT http://localhost:3000/api/ratings/RATING_ID
- Body:
  ```json
  {
    "score": 5,
    "comment": "Updated: This item exceeded my expectations!"
  }
  ```

**Delete a rating**
- DELETE http://localhost:3000/api/ratings/RATING_ID

### Owner Rating Endpoints

**Create an owner rating**
- POST http://localhost:3000/api/owner-ratings
- Body:
  ```json
  {
    "ownerId": "YOUR_OWNER_ID",
    "score": 4,
    "comment": "Great owner, very responsive!",
    "communication": 5,
    "reliability": 4,
    "itemCondition": 4
  }
  ```

**Get ratings for an owner**
- GET http://localhost:3000/api/owner-ratings/owner/YOUR_OWNER_ID

**Update an owner rating**
- PUT http://localhost:3000/api/owner-ratings/RATING_ID
- Body:
  ```json
  {
    "score": 5,
    "comment": "Updated: Excellent service!",
    "communication": 5,
    "reliability": 5,
    "itemCondition": 5
  }
  ```

**Delete an owner rating**
- DELETE http://localhost:3000/api/owner-ratings/RATING_ID

## Authentication

All endpoints except the GET endpoints require authentication. Add the following header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

You can get a token by logging in with a valid user. 