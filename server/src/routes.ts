import dayjs from "dayjs"
import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "./lib/prisma"

export async function appRoutes(app: FastifyInstance) {
  app.post('/habits', async (request) => {

    const createdHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(
        z.number().min(0).max(6)
      )
    })

    const { title, weekDays } = createdHabitBody.parse(request.body)

    const today = dayjs().startOf('day').toDate()
    
    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        weekDays: {
          create: weekDays.map(weekDay => {
            return {
              week_day: weekDay,
            }
          })
        }
      }
    })
  })

  app.get('/day', async (request) => {
    const getDayParams = z.object({
      date: z.coerce.date() // converte o parâmetro que receber dentro de date em uma data (pois ela vem como uma String)
    })

    const { date } = getDayParams.parse(request.query) // localhost:3333/day?date=2022-01-13T00

    const parsedDate = dayjs(date).startOf('day')
    const weekDay = dayjs(date).get('day')

    // todos hábitos possiveis
    // hábitos que já foram completados

    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: date, // lte ==> menor ou igual ( <= )
        },
        weekDays: {
          some: {
            week_day: weekDay
          }
        }
      }
    })

    const day = await prisma.day.findUnique({
      where: {
        date: parsedDate.toDate(),
      },
      include: {
        dayHabits: true,
      }
    })

    const completedHabits = day?.dayHabits.map(dayHabit => { // a interrogação vai verificar se o day não é null
      return dayHabit.habit_id
    })

    return {
      possibleHabits,
      completedHabits
    }
  })
}
