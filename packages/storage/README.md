# @ts-framework/storage

This package allows services to read and write files and state on the disk. It uses the plain filesystem for files and
uses `sqlite3` for state by default, but both should eventually be configurable with other sources like S3, Redis, and
MySQL.
