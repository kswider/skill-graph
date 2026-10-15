CREATE TABLE "basic_users" (
	"user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "basic_users" ADD CONSTRAINT "basic_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;