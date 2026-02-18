const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log(' Creating test users...')
  
  // Clean database
  await prisma.transfer.deleteMany({})
  await prisma.user.deleteMany({})
  
  // Create Alice
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      password: '123456',
      balance: 1000.00
    }
  })
  
  // Create Bob
  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob',
      password: '123456',
      balance: 500.00
    }
  })
  
  console.log(' Users created:')
  console.log('  Alice ID:', alice.id, 'Balance: ' + alice.balance)
  console.log('  Bob ID:', bob.id, 'Balance: ' + bob.balance)
  
  // Create transfer
  const transfer = await prisma.transfer.create({
    data: {
      amount: 100.00,
      senderId: alice.id,
      recipientId: bob.id,
      reference: 'Test payment',
      status: 'COMPLETED',
      completedAt: new Date()
    }
  })
  
  console.log(' Transfer created:', transfer.id)
  console.log(' Database ready!')
}

main()
  .catch(e => console.error(' Error:', e))
  .finally(() => prisma.$disconnect())
