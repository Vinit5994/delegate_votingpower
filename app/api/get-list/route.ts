import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';
import { MongoClient } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri ="mongodb+srv://chora-club:VIsYV9nBcTpTDpme@choraclub.2uqnfpc.mongodb.net/chora-club"; // Your MongoDB connection string
const client = new MongoClient(uri);

const apolloClient = new ApolloClient({
  link: createHttpLink({ uri: "https://api.goldsky.com/api/public/project_clx4gqdt1qtw801u4gaxz1xh8/subgraphs/pooltogether/1.0.0/gn", fetch }),
  cache: new InMemoryCache(),
});

const DELEGATE_QUERY = gql`
  query MyQuery($delegate: String!) {
      delegateVotesChangeds(where: {delegate: $delegate , blockTimestamp_lte: "1718081955"}, 
      orderBy: blockTimestamp
      orderDirection: desc
      first: 1) {
        newBalance
      }
  }
`;

export const GET = async (req: NextRequest) => {
  try {
    // Connect to MongoDB
   await client.connect();
    const db = client.db('delegates-list'); // Replace with your database name
    const collection = db.collection('op-delegates-list');

    const batchSize = 10;
    let skip = 0;
    let hasMoreData = true;
    let count = 0;

    while (hasMoreData) {
      // Fetch a batch of toDelegate data from MongoDB
      const toDelegates = await collection.find().skip(135100).limit(50000).toArray();
      if (toDelegates.length === 0) { 
        hasMoreData = false;
        break;
      }
console.log("list of 10 delegate ",toDelegates);
      // Execute the GraphQL query for each delegate
      for (const toDelegate of toDelegates) {
        
        const delegate = toDelegate.toDelegate;

        const result = await apolloClient.query({
          query: DELEGATE_QUERY,
          variables: { delegate },
        });
        const fetchedData = result.data.delegateVotesChangeds[0];
        console.log(fetchedData);
        count++;
        console.log("count",count)
        if (fetchedData) {
          // Update MongoDB document with the fetched data
         
          await collection.updateOne(
            { toDelegate : delegate },
            { $set: { newBalance: fetchedData.newBalance } },
            { upsert: true }
          );
          
        }
      }

    //   skip += batchSize;
    hasMoreData = false;
    }

    return NextResponse.json({ message: 'Delegates data fetched successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred.' }, { status: 500 });
  }
};
