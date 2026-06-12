'use client'

import { useState } from 'react'
import Link from 'next/link'
import { animationVocabulary, getAllVocabularyEntries } from './data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

const allEntries = getAllVocabularyEntries()

export function AnimationVocabularyGrid() {
  const [selectedCategory, setSelectedCategory] = useState(animationVocabulary[0]?.id || '')

  const implementedCount = allEntries.filter(({ entry }) => entry.implementation).length
  const totalCount = allEntries.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Animation Vocabulary</h1>
        <p className="text-muted-foreground">
          A categorized registry of {totalCount} motion patterns. {implementedCount} implemented, {totalCount - implementedCount} ready to implement.
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full overflow-x-auto">
          {animationVocabulary.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Category Content */}
        {animationVocabulary.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{category.name}</h2>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>

            {/* Animation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.entries.map((entry) => {
                const isImplemented = Boolean(entry.implementation)
                return (
                  <Link
                    key={entry.id}
                    href={`/animations?term=${entry.id}`}
                    className="transition-transform hover:scale-105"
                  >
                    <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{entry.name}</CardTitle>
                          </div>
                          <Badge
                            variant={isImplemented ? 'default' : 'outline'}
                            className="whitespace-nowrap"
                          >
                            {isImplemented ? '✓ Live' : 'Pending'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="line-clamp-2">
                          {entry.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Stats Footer */}
      <div className="bg-card rounded-lg border p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total Animations</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent">{implementedCount}</div>
            <div className="text-sm text-muted-foreground">Implemented</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalCount - implementedCount}</div>
            <div className="text-sm text-muted-foreground">To Implement</div>
          </div>
        </div>
      </div>
    </div>
  )
}
