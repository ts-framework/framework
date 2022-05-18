# @ts-framework/scheduler

This package allows services to run tasks on an interval. These intervals can be declared in either milliseconds or
cron strings. It also uses `@ts-framework/storage` to track when tasks are due and can automatically retry tasks that
throw errors.

In addition, this package exports a service attribute that can be used to denote a service method as a task handler.
The application can then schedule that method to run on demand with variable input.
