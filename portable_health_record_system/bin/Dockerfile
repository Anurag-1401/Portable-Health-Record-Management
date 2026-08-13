FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/portable-health-record-backend-1.0.0.jar app.jar
EXPOSE 8000
ENTRYPOINT ["java", "-jar", "app.jar"]
